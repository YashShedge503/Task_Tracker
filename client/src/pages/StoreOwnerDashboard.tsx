import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, MessageSquare, Calendar, TrendingUp, Key } from "lucide-react";
import { useLocation } from "wouter";
import StarRating from "@/components/StarRating";
import { format } from "date-fns";

export default function StoreOwnerDashboard() {
  const [, setLocation] = useLocation();

  // Fetch stores owned by this user
  const { data: stores = [] } = useQuery({
    queryKey: ["/api/store-owner/stores"],
  });

  // For demo purposes, we'll use the first store
  const store = stores[0];

  // Fetch ratings for the store
  const { data: ratingsData } = useQuery({
    queryKey: ["/api/store-owner/ratings", store?.id],
    enabled: !!store?.id,
  });

  const ratings = ratingsData?.ratings || [];
  const stats = ratingsData?.stats || { averageRating: 0, totalRatings: 0 };

  const goToChangePassword = () => {
    setLocation("/change-password");
  };

  // Calculate monthly ratings (simplified - last 30 ratings as "this month")
  const monthlyRatings = Math.min(ratings.length, 30);

  // Calculate trend (simplified - positive if average > 3)
  const trend = stats.averageRating > 3 ? "+0.3" : "-0.2";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Store Owner Dashboard</h1>
          <Button variant="outline" onClick={goToChangePassword}>
            <Key className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div>

        {!store && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-slate-600">
                No store found. Please contact the administrator to assign a store to your account.
              </p>
            </CardContent>
          </Card>
        )}

        {store && (
          <>
            {/* Store Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Star className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Average Rating</dt>
                        <dd className="text-2xl font-semibold text-slate-900">
                          {stats.averageRating.toFixed(1)}
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
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Total Ratings</dt>
                        <dd className="text-2xl font-semibold text-slate-900">
                          {stats.totalRatings}
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
                      <Calendar className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">This Month</dt>
                        <dd className="text-2xl font-semibold text-slate-900">
                          {monthlyRatings}
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
                      <TrendingUp className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-slate-500 truncate">Rating Trend</dt>
                        <dd className="text-2xl font-semibold text-green-600">
                          {trend}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Store Info */}
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-900">Store Name</h4>
                    <p className="text-slate-600">{store.name}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Email</h4>
                    <p className="text-slate-600">{store.email}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-slate-900">Address</h4>
                    <p className="text-slate-600">{store.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ratings List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Customer Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                {ratings.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ratings.map((rating: any) => (
                          <TableRow key={rating.id}>
                            <TableCell className="font-medium">
                              {rating.user.name || "Anonymous"}
                            </TableCell>
                            <TableCell>{rating.user.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <StarRating rating={rating.rating} size="sm" />
                                <span>{rating.rating}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(rating.createdAt), "MMM dd, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No ratings yet for your store.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
