import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Check, Loader2, MapPin, Navigation, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { type FacebookPlace, useSearchPlaces } from "@/queries/platform-search";
import { useComposerStore } from "@/stores/composer-store";

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Location Dialog for tagging places in Facebook posts
 */
export function LocationDialog({ open, onOpenChange }: LocationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<FacebookPlace | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const composer = useComposerStore();

  // Debounce search query
  const updateDebouncedQuery = useDebounceCallback((value: string) => {
    setDebouncedQuery(value.trim());
  }, 300);

  // Get first selected Facebook account for access token
  const firstFacebookAccount = useMemo(() => {
    return composer.accounts.find(
      (acc) =>
        acc.platform === "FACEBOOK" &&
        composer.selectedAccounts.includes(acc.id),
    );
  }, [composer.accounts, composer.selectedAccounts]);

  // Search places API
  const { data: searchResults, isLoading } = useSearchPlaces({
    query: debouncedQuery,
    connectedAccountId: firstFacebookAccount?.id ?? "",
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    distance: 5000, // 5km radius
    enabled: debouncedQuery.length > 0 && !!firstFacebookAccount,
  });

  // Get user's current location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Failed to get your location. Please try again.");
        setIsGettingLocation(false);
      },
    );
  };

  const handleSelectPlace = (place: FacebookPlace) => {
    setSelectedPlace(place);
  };

  const handleSave = () => {
    if (!selectedPlace) return;
    // TODO: Save to store with composer.setFacebookLocation(selectedPlace)
    onOpenChange(false);
  };

  const places = searchResults?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Location
          </DialogTitle>
          <DialogDescription>
            Tag a location to show where you are or what your post is about.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="location-search">Search for a location</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="h-7 text-xs"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Navigation className="h-3 w-3 mr-1.5" />
                )}
                {userLocation ? "Location detected" : "Use my location"}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="location-search"
                placeholder="Search places, cities, or businesses..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateDebouncedQuery(e.target.value);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Search Results */}
          {debouncedQuery && (
            <div className="space-y-2">
              <ScrollArea className="h-[300px] rounded-md border">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : places.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No places found for "{debouncedQuery}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try a different search term or use your location
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {places.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => handleSelectPlace(place)}
                        className={`w-full text-left p-3 rounded-md hover:bg-accent transition-colors ${
                          selectedPlace?.id === place.id ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm font-medium truncate">
                                {place.name}
                              </p>
                              {selectedPlace?.id === place.id && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            {place.location && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {[
                                  place.location.street,
                                  place.location.city,
                                  place.location.state,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                            {place.category && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5 ml-6">
                                {place.category}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {!debouncedQuery && (
            <div className="rounded-md border border-dashed p-8 text-center">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Start typing to search for places
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Or use your current location for nearby results
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedPlace}>
            Add Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
