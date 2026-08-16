/** Geographic shortcuts for popular area links on the home page. */
export interface PopularArea {
  name: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
}

export const POPULAR_AREAS: PopularArea[] = [
  { name: "Indiranagar", city: "Bengaluru", pincode: "560038", lat: 12.9784, lng: 77.6408 },
  { name: "Koramangala", city: "Bengaluru", pincode: "560034", lat: 12.9352, lng: 77.6245 },
  { name: "Whitefield", city: "Bengaluru", pincode: "560066", lat: 12.9698, lng: 77.75 },
  { name: "HSR Layout", city: "Bengaluru", pincode: "560102", lat: 12.9116, lng: 77.6473 },
  { name: "Hebbal", city: "Bengaluru", pincode: "560024", lat: 13.0358, lng: 77.597 },
  { name: "Jayanagar", city: "Bengaluru", pincode: "560011", lat: 12.9308, lng: 77.5838 },
  { name: "Electronic City", city: "Bengaluru", pincode: "560100", lat: 12.8452, lng: 77.6602 },
  { name: "Yelahanka", city: "Bengaluru", pincode: "560064", lat: 13.1007, lng: 77.5963 },
];
