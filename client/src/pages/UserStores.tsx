import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Search } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StarRating from "@/components/StarRating";

export default function UserStores() {
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ["/api/stores", { search: searchName, address: searchAddress }],
  });

  // Rating mutation
  const ratingMutation = useMutation({
    mutationFn: ({ storeId, rating }: { storeId: number; rating: number }) =>
      apiRequest("POST", "/api/ratings", { storeId, rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Success", description: "Rating submitted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
  };

  const handleRatingChange = (storeId: number, rating: number) => {
    ratingMutation.mutate({ storeId, rating });
  };

  const goToSettings = () => {
    setLocation("/change-password");
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900">Store Directory</h1>
          <Button variant="outline" onClick={goToSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </Button>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search stores by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Search by address..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store: any) => (
            <Card key={store.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <div className="text-4xl font-bold text-slate-400">
                  {store.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{store.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{store.address}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <StarRating rating={store.averageRating} size="sm" />
                    <span className="text-sm text-slate-600">
                      {store.averageRating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {store.totalRatings} ratings
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Your Rating:</span>
                    {store.userRating ? (
                      <StarRating rating={store.userRating} size="sm" />
                    ) : (
                      <span className="text-sm text-slate-400 italic">Not rated yet</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    <StarRating
                      rating={store.userRating || 0}
                      interactive
                      onRatingChange={(rating) => handleRatingChange(store.id, rating)}
                    />
                  </div>
                  
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={ratingMutation.isPending}
                    onClick={() => {
                      // This will be handled by the interactive star rating above
                    }}
                  >
                    {store.userRating ? "Update Rating" : "Submit Rating"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stores.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">No stores found. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
