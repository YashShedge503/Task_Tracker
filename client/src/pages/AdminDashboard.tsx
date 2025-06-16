import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Store, Star, Plus, Search, SquareChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, insertStoreSchema, type InsertUser, type InsertStore } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StarRating from "@/components/StarRating";

export default function AdminDashboard() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users", { role: roleFilter, search: userSearch }],
  });

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ["/api/stores", { search: storeSearch }],
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: (userData: InsertUser) => apiRequest("POST", "/api/admin/users", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsAddUserOpen(false);
      toast({ title: "Success", description: "User added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    },
  });

  // Add store mutation
  const addStoreMutation = useMutation({
    mutationFn: (storeData: InsertStore) => apiRequest("POST", "/api/admin/stores", storeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsAddStoreOpen(false);
      toast({ title: "Success", description: "Store added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add store",
        variant: "destructive",
      });
    },
  });

  // Forms
  const userForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { role: "normal" },
  });

  const storeForm = useForm<InsertStore>({
    resolver: zodResolver(insertStoreSchema),
  });

  const onSubmitUser = (data: InsertUser) => {
    addUserMutation.mutate(data);
  };

  const onSubmitStore = (data: InsertStore) => {
    addStoreMutation.mutate(data);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "store_owner":
        return "secondary";
      case "normal":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "System Administrator";
      case "store_owner":
        return "Store Owner";
      case "normal":
        return "Normal User";
      default:
        return role;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">System Administrator Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Total Users</dt>
                    <dd className="text-2xl font-semibold text-slate-900">
                      {stats?.totalUsers || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Total Stores</dt>
                    <dd className="text-2xl font-semibold text-slate-900">
                      {stats?.totalStores || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Total Ratings</dt>
                    <dd className="text-2xl font-semibold text-slate-900">
                      {stats?.totalRatings || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Card>
          <Tabs defaultValue="stores" className="w-full">
            <div className="border-b border-slate-200">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stores">Stores Management</TabsTrigger>
                <TabsTrigger value="users">Users Management</TabsTrigger>
              </TabsList>
            </div>

            {/* Stores Tab */}
            <TabsContent value="stores" className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-slate-900">Store Listings</h3>
                <div className="flex space-x-3">
                  <Input
                    placeholder="Search stores..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="w-64"
                  />
                  <Dialog open={isAddStoreOpen} onOpenChange={setIsAddStoreOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Store
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Store</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={storeForm.handleSubmit(onSubmitStore)} className="space-y-4">
                        <div>
                          <Label htmlFor="store-name">Name *</Label>
                          <Input
                            id="store-name"
                            {...storeForm.register("name")}
                            placeholder="Enter store name (max 60 characters)"
                          />
                          {storeForm.formState.errors.name && (
                            <p className="text-sm text-destructive mt-1">
                              {storeForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="store-email">Email *</Label>
                          <Input
                            id="store-email"
                            type="email"
                            {...storeForm.register("email")}
                            placeholder="Enter store email"
                          />
                          {storeForm.formState.errors.email && (
                            <p className="text-sm text-destructive mt-1">
                              {storeForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="store-address">Address *</Label>
                          <Textarea
                            id="store-address"
                            {...storeForm.register("address")}
                            placeholder="Enter store address (max 400 characters)"
                            rows={3}
                          />
                          {storeForm.formState.errors.address && (
                            <p className="text-sm text-destructive mt-1">
                              {storeForm.formState.errors.address.message}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="submit"
                            className="flex-1"
                            disabled={addStoreMutation.isPending}
                          >
                            {addStoreMutation.isPending ? "Adding..." : "Add Store"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsAddStoreOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store: any) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.email}</TableCell>
                        <TableCell className="max-w-xs truncate">{store.address}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StarRating rating={store.averageRating} size="sm" />
                            <span className="text-sm text-muted-foreground">
                              {store.averageRating.toFixed(1)} ({store.totalRatings})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-slate-900">User Management</h3>
                <div className="flex space-x-3">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Roles</SelectItem>
                      <SelectItem value="admin">System Administrator</SelectItem>
                      <SelectItem value="normal">Normal User</SelectItem>
                      <SelectItem value="store_owner">Store Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-64"
                  />
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
                        <div>
                          <Label htmlFor="user-name">Name *</Label>
                          <Input
                            id="user-name"
                            {...userForm.register("name")}
                            placeholder="Enter full name (20-60 characters)"
                          />
                          {userForm.formState.errors.name && (
                            <p className="text-sm text-destructive mt-1">
                              {userForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="user-email">Email *</Label>
                          <Input
                            id="user-email"
                            type="email"
                            {...userForm.register("email")}
                            placeholder="Enter email address"
                          />
                          {userForm.formState.errors.email && (
                            <p className="text-sm text-destructive mt-1">
                              {userForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="user-password">Password *</Label>
                          <Input
                            id="user-password"
                            type="password"
                            {...userForm.register("password")}
                            placeholder="8-16 chars, uppercase + special"
                          />
                          {userForm.formState.errors.password && (
                            <p className="text-sm text-destructive mt-1">
                              {userForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="user-address">Address *</Label>
                          <Textarea
                            id="user-address"
                            {...userForm.register("address")}
                            placeholder="Enter address (max 400 characters)"
                            rows={2}
                          />
                          {userForm.formState.errors.address && (
                            <p className="text-sm text-destructive mt-1">
                              {userForm.formState.errors.address.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="user-role">Role *</Label>
                          <Select
                            value={userForm.watch("role")}
                            onValueChange={(value) => userForm.setValue("role", value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal User</SelectItem>
                              <SelectItem value="store_owner">Store Owner</SelectItem>
                              <SelectItem value="admin">System Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          {userForm.formState.errors.role && (
                            <p className="text-sm text-destructive mt-1">
                              {userForm.formState.errors.role.message}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="submit"
                            className="flex-1"
                            disabled={addUserMutation.isPending}
                          >
                            {addUserMutation.isPending ? "Adding..." : "Add User"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsAddUserOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="max-w-xs truncate">{user.address}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
}
