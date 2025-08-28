import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Settings, 
  Activity, 
  Database, 
  Shield, 
  Loader2, 
  Search,
  Mail,
  Calendar,
  BarChart3,
  Download,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  luma_api_key?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalScenes: number;
  totalProjects: number;
  storageUsed: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalScenes: 0,
    totalProjects: 0,
    storageUsed: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user is admin
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        toast.error("Error loading profile");
        return;
      }

      setProfile(profileData);

      if (profileData.role !== "admin") {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      // Load users and stats
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Authentication error");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load users");
        return;
      }

      setUsers(data || []);
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  const loadStats = async () => {
    try {
      // Get user stats
      const { data: userStats } = await supabase
        .from("profiles")
        .select("status");

      const totalUsers = userStats?.length || 0;
      const activeUsers = userStats?.filter(u => u.status === "approved").length || 0;
      const pendingUsers = userStats?.filter(u => u.status === "pending").length || 0;

      // Get scene and project stats
      const { data: sceneStats } = await supabase
        .from("scenes")
        .select("id");

      const { data: projectStats } = await supabase
        .from("projects")
        .select("id");

      setStats({
        totalUsers,
        activeUsers,
        pendingUsers,
        totalScenes: sceneStats?.length || 0,
        totalProjects: projectStats?.length || 0,
        storageUsed: 0 // Would need to calculate from storage
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          status: "approved",
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) {
        toast.error("Failed to approve user");
        return;
      }

      toast.success("User approved successfully");
      await loadUsers();
      await loadStats();
    } catch (error) {
      toast.error("Failed to approve user");
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          status: "rejected",
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) {
        toast.error("Failed to reject user");
        return;
      }

      toast.success("User rejected successfully");
      await loadUsers();
      await loadStats();
    } catch (error) {
      toast.error("Failed to reject user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("delete-project", {
        body: { userId }
      });

      if (error) {
        toast.error("Failed to delete user");
        return;
      }

      toast.success("User deleted successfully");
      await loadUsers();
      await loadStats();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleExportUsers = async () => {
    try {
      const csvContent = [
        ["Email", "Role", "Status", "Created At", "Updated At"],
        ...users.map(user => [
          user.email,
          user.role,
          user.status,
          new Date(user.created_at).toLocaleDateString(),
          new Date(user.updated_at).toLocaleDateString()
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Users exported successfully");
    } catch (error) {
      toast.error("Failed to export users");
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users and monitor system health</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
              <Button onClick={handleExportUsers}>
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeUsers} active, {stats.pendingUsers} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Scenes</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalScenes}</div>
                <p className="text-xs text-muted-foreground">
                  Generated across all projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  Active projects in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.storageUsed}GB</div>
                <p className="text-xs text-muted-foreground">
                  Across all users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Users Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user accounts, approve pending users, and monitor activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search users by email, role, or status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Users Table */}
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium">User</th>
                          <th className="text-left p-4 font-medium">Role</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Created</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-t">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback>
                                    {user.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.email}</p>
                                  <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={
                                  user.status === "approved" ? "default" : 
                                  user.status === "pending" ? "secondary" : "destructive"
                                }
                              >
                                {user.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                {user.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveUser(user.id)}
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRejectUser(user.id)}
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedUser(user)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>User Details</DialogTitle>
                                      <DialogDescription>
                                        Detailed information about {user.email}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Email</Label>
                                        <p className="text-sm">{user.email}</p>
                                      </div>
                                      <div>
                                        <Label>Role</Label>
                                        <p className="text-sm">{user.role}</p>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <p className="text-sm">{user.status}</p>
                                      </div>
                                      <div>
                                        <Label>Created</Label>
                                        <p className="text-sm">{new Date(user.created_at).toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <Label>Last Updated</Label>
                                        <p className="text-sm">{new Date(user.updated_at).toLocaleString()}</p>
                                      </div>
                                      {user.luma_api_key && (
                                        <div>
                                          <Label>API Key</Label>
                                          <div className="flex items-center space-x-2">
                                            <Input
                                              type={showApiKey ? "text" : "password"}
                                              value={user.luma_api_key}
                                              readOnly
                                            />
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => setShowApiKey(!showApiKey)}
                                            >
                                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
