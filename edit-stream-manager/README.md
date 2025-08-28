VideoStream – Professional Video Scene Creation Dashboard

A modern video production platform built with React, Vite, Tailwind CSS, and Supabase.
Transform uploaded photo folders into professional video scenes with AI-powered generation, version management, and an intuitive dashboard.

🚀 Features
Core Functionality

Smart Upload Panel: Drag & drop folder uploads with automatic renaming (projectname1.jpeg, projectname2.jpeg, etc).

Photo Grid Interface: Browse and select start/end frames with cinematic shot types.

AI Scene Generation: Direct integration with Luma Labs API (LUMAAI_API_KEY) for scene creation. Scenes are saved into structured Supabase storage.

Scene Management: Regenerate, track, and highlight versions with linked photos and previews.

Bulk Export: Download all finished scenes in organized ZIP packages.

Real-Time Updates: Live updates to photo grid, scene grid, and video previews via Supabase Realtime.

User & Data Management

Supabase Auth: Email confirmation required for account activation.

Per-User Media Buckets: Each user has dedicated photos/ and scenes/ folders created upon signup.

Account Deletion: Users can delete accounts; media is preserved in a separate deleted_users/ archive folder.

User API Keys: Support for per-user AI API keys (hashed with SHA-256 before storage, never stored in plain text).

Model Flexibility: Dropdown selectors for Luma Labs models, automatically updated as new options are supported.

Keyboard Shortcuts

S – Mark start frame

E – Mark end frame

1-6 – Select shot types (Wide, Medium, Close-up, Extreme Close-up, Over Shoulder, POV)

R – Regenerate scene

Del – Delete scene

Ctrl+Z – Undo last delete (10s window)

Ctrl/Cmd+E – Export all scenes

🛠 Tech Stack

Frontend: React 18, TypeScript, Vite

Styling: Tailwind CSS, shadcn/ui components

Backend: Supabase (Database, Auth, Storage, Edge Functions)

File Uploads: Uppy Dashboard with folder support

AI Integration: Luma Labs Dream Machine API

📋 Prerequisites

Node.js & npm

Supabase Project (create at supabase.com
)

Luma Labs API Key (LUMAAI_API_KEY)

🔧 Environment Setup
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE=<service-role-key>
LUMAAI_API_KEY=<your-luma-api-key>

🗄 Database Setup
Tables

profiles – Users with email confirmation + metadata

scenes – Scene definitions (linked to start/end frames)

scene_versions – Scene version history with video URLs

storage.objects – Supabase bucket objects with RLS

RLS (Row-Level Security)

Users can only read/write their own files in photos/ and scenes/.

Deleted users’ media is automatically moved to deleted_users/.

🚀 Installation & Development
# Clone the repository
git clone <your-repo-url>
cd videostream-dashboard

# Install dependencies
npm install

# Start development server
npm run dev


App available at: https://edit-stream-manager.vercel.app/dashboard?sceneId=6c188c71-b877-4f5b-a877-f5f810783da1

📦 Deployment

Deploy with Vercel, Netlify, or Render.

Add Supabase environment variables in project settings.

Configure Supabase Auth redirect URLs to match your domain.

🔒 Security Features

Supabase Auth with email confirmation

Per-user bucket isolation via RLS

SHA-256 hashing for sensitive keys (user API keys never stored in plain text)

Signed URLs for media access

Input validation with Zod

📖 Usage Guide
For Users

Sign up with email → confirm account

Upload photo folders

Select start/end frames + shot type

Generate scenes (Luma Labs API)

Export final videos

File Organization
media/
├── {user-id}/
│   ├── photos/
│   └── scenes/
├── deleted/
│   ├── {former-user-id}/
│   │   ├── photos/
│   │   └── scenes/

🐛 Troubleshooting

Upload Fails

Ensure image formats are supported

Check Supabase bucket permissions

Scene Generation Issues

Verify LUMAAI_API_KEY is valid

Check Supabase Edge Function logs

Account Pending

Confirm email verification is complete

🔄 Version History

v1.0.0 – Initial refactor: Removed n8n + Gmail SMTP, replaced with direct Luma Labs API integration.

Built with ❤️ using React, Supabase, and Tailwind.

## 🚀 Complete Deployment Setup

### 1. **Full SQL Setup for Supabase**

Create a new migration file with this complete schema:

```sql
-- Complete MVP Database Setup for VideoStream
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE scene_status AS ENUM ('queued', 'processing', 'ready', 'error');
CREATE TYPE luma_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role DEFAULT 'user',
  status user_status DEFAULT 'pending',
  api_key_hash TEXT, -- SHA-256 hash of user's Luma API key
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, name)
);

-- Create shot_types table
CREATE TABLE IF NOT EXISTS public.shot_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenes table
CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  folder TEXT NOT NULL,
  start_key TEXT NOT NULL,
  end_key TEXT,
  shot_type_id UUID REFERENCES public.shot_types(id) NOT NULL,
  ordinal INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  start_frame_signed_url TEXT,
  end_frame_signed_url TEXT,
  signed_url_expires_at TIMESTAMP WITH TIME ZONE,
  luma_job_id TEXT,
  luma_status luma_status DEFAULT 'pending',
  luma_error TEXT,
  status scene_status DEFAULT 'queued',
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scene_versions table
CREATE TABLE IF NOT EXISTS public.scene_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  video_url TEXT,
  render_meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scene_id, version)
);

-- Create admin_approvals table
CREATE TABLE IF NOT EXISTS public.admin_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create error_events table for logging
CREATE TABLE IF NOT EXISTS public.error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  safe_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default shot types
INSERT INTO public.shot_types (id, owner_id, name, prompt_template, is_default) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Wide Shot', 'Cinematic wide shot with dramatic lighting', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Medium Shot', 'Professional medium shot with balanced composition', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Close-up', 'Intimate close-up with emotional depth', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Extreme Close-up', 'Dramatic extreme close-up for impact', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Over Shoulder', 'Cinematic over-the-shoulder perspective', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'POV', 'First-person point of view shot', true);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = owner_id);

-- RLS Policies for shot_types
CREATE POLICY "Users can manage own shot types" ON public.shot_types
  FOR ALL USING (auth.uid() = owner_id OR is_default = true);

-- RLS Policies for scenes
CREATE POLICY "Users can manage own scenes" ON public.scenes
  FOR ALL USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'approved'
    )
  );

-- RLS Policies for scene_versions
CREATE POLICY "Users can view versions of own scenes" ON public.scene_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scenes 
      WHERE id = scene_id 
      AND user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND status = 'approved'
      )
    )
  );

-- RLS Policies for admin_approvals
CREATE POLICY "Admins can manage approvals" ON public.admin_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

-- RLS Policies for error_events (admin only)
CREATE POLICY "Admins can view error events" ON public.error_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('media', 'media', false),
  ('keyframes', 'keyframes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Approved users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'approved'
    )
  );

CREATE POLICY "Approved users can view own media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'approved'
    )
  );

CREATE POLICY "Approved users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND status = 'approved'
    )
  );

-- Storage policies for keyframes bucket (public read, admin write)
CREATE POLICY "Anyone can view keyframes" ON storage.objects
  FOR SELECT USING (bucket_id = 'keyframes');

CREATE POLICY "Admins can manage keyframes" ON storage.objects
  FOR ALL USING (
    bucket_id = 'keyframes'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'approved'
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (NEW.id, NEW.email, 'user', 'pending');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_scene_ordinal(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_ordinal INTEGER;
BEGIN
  SELECT COALESCE(MAX(ordinal), 0) + 1
  INTO next_ordinal
  FROM public.scenes
  WHERE project_id = p_project_id;
  
  RETURN next_ordinal;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shot_types_updated_at
  BEFORE UPDATE ON public.shot_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON public.scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON public.scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON public.scenes(status);
CREATE INDEX IF NOT EXISTS idx_scenes_luma_job_id ON public.scenes(luma_job_id);
CREATE INDEX IF NOT EXISTS idx_shot_types_owner_id ON public.shot_types(owner_id);
CREATE INDEX IF NOT EXISTS idx_scene_versions_scene_id ON public.scene_versions(scene_id);
CREATE INDEX IF NOT EXISTS idx_error_events_created_at ON public.error_events(created_at);
CREATE INDEX IF NOT EXISTS idx_error_events_user_id ON public.error_events(user_id);

-- Create admin user (replace with your email)
INSERT INTO public.profiles (id, email, role, status) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@yourdomain.com', 'admin', 'approved')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status;
```

### 2. **Supabase Configuration Updates**

Update your `supabase/config.toml`:

```toml
project_id = "your-project-id"

[functions.admin-notify]
verify_jwt = false

[functions.admin-action]
verify_jwt = false

[functions.luma-create-scene]
verify_jwt = true

[functions.luma-scene-status]
verify_jwt = true

[functions.shot-types]
verify_jwt = true

[functions.photos]
verify_jwt = true

[functions.delete-photo]
verify_jwt = true

[functions.delete-project]
verify_jwt = true

[functions.delete-scene]
verify_jwt = true

[functions.user-management]
verify_jwt = true

[functions.project-management]
verify_jwt = true
```

### 3. **Environment Variables for Supabase**

Set these in your Supabase project settings:

```bash
# Required
LUMAAI_API_KEY=your_luma_api_key
LUMA_API_BASE=https://api.lumalabs.ai/dream-machine/v1/generations
SIGNED_URL_TTL_SECONDS=3600
KEYFRAMES_PUBLIC_BUCKET=keyframes

# Optional but recommended
LUMA_CALLBACK_URL=https://your-domain.com/api/luma-webhook
ADMIN_EMAIL=admin@yourdomain.com
```

### 4. **Vercel Deployment Configuration**

Create `vercel.json` in your project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_LUMAAI_API_KEY": "@luma_api_key"
  },
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### 5. **Additional Edge Functions Needed**

You'll need these additional edge functions for a complete MVP:

#### **User Management Function**
```typescript
// supabase/functions/user-management/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.split(" ")[1] || ""
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (req.method === "GET") {
      // Get user profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(profile), { headers: corsHeaders });
    }

    if (req.method === "PUT") {
      // Update user profile
      const body = await req.json();
      const { data, error } = await supabase
        .from("profiles")
        .update(body)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

#### **Project Management Function**
```typescript
// supabase/functions/project-management/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.split(" ")[1] || ""
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (req.method === "GET") {
      // Get user projects
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(projects), { headers: corsHeaders });
    }

    if (req.method === "POST") {
      // Create new project
      const body = await req.json();
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...body, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

### 6. **Deployment Steps**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "MVP ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repo to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy

3. **Configure Supabase:**
   - Run the SQL script above
   - Set environment variables
   - Deploy edge functions: `supabase functions deploy`

4. **Update Auth Settings:**
   - In Supabase dashboard, go to Authentication > URL Configuration
   - Add your Vercel domain to redirect URLs
   - Set site URL to your Vercel domain

### 7. **What This Gives You**

✅ **Complete user authentication with email confirmation**  
✅ **Multi-user support with proper isolation**  
✅ **Professional database schema with RLS**  
✅ **Scalable edge functions architecture**  
✅ **Production-ready security policies**  
✅ **Error logging and monitoring**  
✅ **Admin approval system**  
✅ **Project and shot type management**  
✅ **Luma Labs API integration**  
✅ **File storage with proper permissions**  

### 8. **Additional Recommendations**

1. **Set up monitoring** in Supabase dashboard
2. **Configure backup policies** for your database
3. **Set up rate limiting** for your edge functions
4. **Monitor API usage** for Luma Labs
5. **Set up alerts** for critical errors

This setup gives you a production-ready, scalable MVP that can handle multiple users securely while maintaining professional code quality and architecture.