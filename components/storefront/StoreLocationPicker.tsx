"use client";

import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLoadScript } from "@react-google-maps/api";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { normalizeRegion } from "@/lib/shipping/trinidad-zoning";

const DEFAULT_LAT = 10.6549;
const DEFAULT_LNG = -61.5019;

/** Stable reference for useLoadScript (avoid reload warnings). */
const GOOGLE_LIBRARIES: ["places"] = ["places"];

function extractCityFromComponents(
  components: google.maps.GeocoderAddressComponent[],
): string | null {
  const typePriority = [
    "locality",
    "administrative_area_level_2",
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
  ];
  for (const type of typePriority) {
    const component = components.find((c) => c.types.includes(type));
    if (component) return component.long_name;
  }
  return null;
}

function detectRegionFromAddress(address: string): string | null {
  if (!address) return null;
  const normalized = normalizeRegion(address);

  for (const option of TRINIDAD_ONBOARDING_REGION_OPTIONS) {
    const optionNormalized = normalizeRegion(option.value);
    if (normalized.includes(optionNormalized)) {
      return option.value;
    }
  }

  const parts = address.split(",").map((p) => p.trim());
  for (const part of parts) {
    const partNormalized = normalizeRegion(part);
    for (const option of TRINIDAD_ONBOARDING_REGION_OPTIONS) {
      if (normalizeRegion(option.value) === partNormalized) {
        return option.value;
      }
    }
  }

  return null;
}

type Props = {
  initialAddress: string;
  initialLat: number | null;
  initialLng: number | null;
  onRegionDetected?: (region: string | null) => void;
};

function LocationPickerShared({
  address,
  setAddress,
  lat,
  lng,
  setLat,
  setLng,
  inputRef,
  mapboxToken,
  fromAutocomplete,
  onRegionDetected,
}: {
  address: string;
  setAddress: (v: string) => void;
  lat: number | null;
  lng: number | null;
  setLat: (v: number) => void;
  setLng: (v: number) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  mapboxToken: string;
  fromAutocomplete: RefObject<boolean>;
  onRegionDetected?: (region: string | null) => void;
}) {
  const [mapKey, setMapKey] = useState(0);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSupported, setGeoSupported] = useState(false);
  const [addressDetectionNote, setAddressDetectionNote] = useState<string | null>(null);
  const [addressValue, setAddressValue] = useState("");
  const onRegionDetectedRef = useRef(onRegionDetected);
  onRegionDetectedRef.current = onRegionDetected;

  useEffect(() => {
    setGeoSupported(typeof navigator !== "undefined" && !!navigator.geolocation);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const addressInput = document.querySelector(
        'input[name="locationAddress"]',
      ) as HTMLInputElement | null;
      if (!addressInput) return;
      const polledAddress = addressInput.value;
      if (polledAddress && polledAddress !== addressValue) {
        setAddressValue(polledAddress);
        const detected = detectRegionFromAddress(polledAddress);
        if (detected) {
          onRegionDetectedRef.current?.(detected);
          setAddressDetectionNote(null);
        } else {
          const lowerAddress = polledAddress.toLowerCase();
          if (lowerAddress.includes("trinidad") || lowerAddress.includes("tobago")) {
            setAddressDetectionNote(
              "We found your location in Trinidad & Tobago but could not identify your specific area. Please select your region below.",
            );
          } else {
            setAddressDetectionNote(null);
          }
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [addressValue]);

  useEffect(() => {
    if (!fromAutocomplete.current) return;
    fromAutocomplete.current = false;
    // The key prop on the Map handles re-centering
    // We need to force it to update by changing the key
    setMapKey((prev) => prev + 1);
  }, [lat, lng]);

  const showMap = mapboxToken.length > 0;

  const markerLng = lng ?? DEFAULT_LNG;
  const markerLat = lat ?? DEFAULT_LAT;

  function handleUseLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fromAutocomplete.current = true;
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: position.coords.latitude, lng: position.coords.longitude } },
            (results, status) => {
              if (status === "OK" && results && results.length > 0) {
                const best =
                  results.find(
                    (r) =>
                      r.types.includes("street_address") ||
                      r.types.includes("premise") ||
                      r.types.includes("route"),
                  ) ??
                  results.find((r) => !r.formatted_address.includes("+")) ??
                  results[0];
                setAddress(best.formatted_address);
              }
            },
          );
        }
        setGeoLoading(false);
      },
      () => {
        setGeoError("Could not get your location. Please type your address.");
        setGeoLoading(false);
      },
    );
  }

  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Address
        <input
          ref={inputRef}
          autoComplete="off"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search or type your address"
          type="text"
          value={address}
        />
      </label>

      {geoSupported ? (
        <div className="mt-2">
          <button
            className="text-sm text-zinc-600 border border-zinc-300 rounded-lg px-3 py-1.5 hover:bg-zinc-50"
            disabled={geoLoading}
            onClick={handleUseLocation}
            type="button"
          >
            {geoLoading ? "Locating..." : "Use my location"}
          </button>
          {geoError ? (
            <p className="mt-2 text-sm text-zinc-600">{geoError}</p>
          ) : null}
        </div>
      ) : null}

      <input name="locationAddress" type="hidden" value={address} />
      <input name="locationLat" type="hidden" value={lat !== null ? String(lat) : ""} />
      <input name="locationLng" type="hidden" value={lng !== null ? String(lng) : ""} />

      {showMap ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
          <Map
            key={mapKey}
            initialViewState={{
              longitude: lng ?? DEFAULT_LNG,
              latitude: lat ?? DEFAULT_LAT,
              zoom: lat ? 14 : 12,
            }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapboxToken}
            scrollZoom={true}
            doubleClickZoom={true}
            touchZoomRotate={true}
            style={{ width: "100%", height: "300px" }}
          >
            <Marker
              draggable
              latitude={markerLat}
              longitude={markerLng}
              onDragEnd={(e) => {
                const newLat = e.lngLat.lat;
                const newLng = e.lngLat.lng;
                setLat(newLat);
                setLng(newLng);
                if (window.google) {
                  const geocoder = new window.google.maps.Geocoder();
                  geocoder.geocode(
                    { location: { lat: newLat, lng: newLng } },
                    (results, status) => {
                      if (status === "OK" && results && results.length > 0) {
                        const best =
                          results.find(
                            (r) =>
                              r.types.includes("street_address") ||
                              r.types.includes("premise") ||
                              r.types.includes("route"),
                          ) ??
                          results.find((r) => !r.formatted_address.includes("+")) ??
                          results[0];
                        setAddress(best.formatted_address);
                      }
                    },
                  );
                }
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#D4450A",
                }}
              />
            </Marker>
          </Map>
        </div>
      ) : null}

      {addressDetectionNote ? (
        <p className="mt-2 text-xs text-amber-600">{addressDetectionNote}</p>
      ) : null}
    </>
  );
}

function StoreLocationPickerManual(props: Props) {
  const [address, setAddress] = useState(props.initialAddress);
  const [lat, setLat] = useState<number | null>(props.initialLat);
  const [lng, setLng] = useState<number | null>(props.initialLng);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fromAutocomplete = useRef(false);

  const mapboxToken = useMemo(() => {
    const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    return typeof t === "string" ? t.trim() : "";
  }, []);

  return (
    <LocationPickerShared
      address={address}
      fromAutocomplete={fromAutocomplete}
      inputRef={inputRef}
      lat={lat}
      lng={lng}
      mapboxToken={mapboxToken}
      onRegionDetected={props.onRegionDetected}
      setAddress={setAddress}
      setLat={setLat}
      setLng={setLng}
    />
  );
}

function StoreLocationPickerWithGoogle({ googleMapsApiKey, ...props }: Props & { googleMapsApiKey: string }) {
  const [address, setAddress] = useState(props.initialAddress);
  const [lat, setLat] = useState<number | null>(props.initialLat);
  const [lng, setLng] = useState<number | null>(props.initialLng);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fromAutocomplete = useRef(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey,
    libraries: GOOGLE_LIBRARIES,
  });

  const onRegionDetectedRef = useRef(props.onRegionDetected);
  onRegionDetectedRef.current = props.onRegionDetected;

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "address_components"],
      componentRestrictions: { country: "tt" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const newLat = place.geometry.location.lat();
      const newLng = place.geometry.location.lng();
      setAddress(place.formatted_address ?? "");

      const addressComponents = place.address_components ?? [];
      const cityFromComponents = extractCityFromComponents(addressComponents);

      let detectedRegion: string | null = null;
      if (cityFromComponents) {
        detectedRegion = detectRegionFromAddress(cityFromComponents);
      }
      if (!detectedRegion) {
        detectedRegion = detectRegionFromAddress(place.formatted_address ?? "");
      }
      if (!detectedRegion) {
        detectedRegion = null;
      }

      const cb = onRegionDetectedRef.current;
      if (cb) {
        cb(detectedRegion);
      }

      fromAutocomplete.current = true;
      setLat(newLat);
      setLng(newLng);
    });

    return () => {
      window.google.maps.event.removeListener(listener);
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [isLoaded]);

  const mapboxToken = useMemo(() => {
    const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    return typeof t === "string" ? t.trim() : "";
  }, []);

  return (
    <LocationPickerShared
      address={address}
      fromAutocomplete={fromAutocomplete}
      inputRef={inputRef}
      lat={lat}
      lng={lng}
      mapboxToken={mapboxToken}
      onRegionDetected={props.onRegionDetected}
      setAddress={setAddress}
      setLat={setLat}
      setLng={setLng}
    />
  );
}

export default function StoreLocationPicker(props: Props) {
  const googleKey = useMemo(() => {
    const k = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    return typeof k === "string" ? k.trim() : "";
  }, []);

  if (googleKey) {
    return <StoreLocationPickerWithGoogle {...props} googleMapsApiKey={googleKey} />;
  }

  return <StoreLocationPickerManual {...props} />;
}
