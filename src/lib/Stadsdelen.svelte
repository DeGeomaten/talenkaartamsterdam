<script lang="ts">
  import { getContext } from "svelte";
  import MapLibreGL from "maplibre-gl";

  interface Props {
    geojsonData: GeoJSON.FeatureCollection;
  }

  let { geojsonData, onselect }: Props = $props();
  const mapCtx = getContext<{
    getMap: () => MapLibreGL.Map | null;
    isLoaded: () => boolean;
  }>("map");

  let isLayerVisible = $state(false);
  let hoveredStadsdeel: string | null = $state(null);
  let selectedStadsdeel: string | null = $state(null);

  $effect(() => {
    if (onselect) {
      onselect(selectedStadsdeel);
    }
  });

  $effect(() => {
    const map = mapCtx?.getMap();
    if (!map || !mapCtx?.isLoaded()) return;

    if (!map.getSource("stadsdelen")) {
      map.addSource("stadsdelen", { type: "geojson", data: geojsonData });
    }

    if (!map.getLayer("stadsdelen-fill")) {
      map.addLayer({
        id: "stadsdelen-fill",
        type: "fill",
        source: "stadsdelen",
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.2,
        },
        layout: { visibility: isLayerVisible ? "visible" : "none" },
      });
    }

    if (!map.getLayer("stadsdelen-outline")) {
      map.addLayer({
        id: "stadsdelen-outline",
        type: "line",
        source: "stadsdelen",
        paint: {
          "line-color": "#16a34a",
          "line-width": 2,
        },
        layout: { visibility: isLayerVisible ? "visible" : "none" },
      });
    }

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      hoveredStadsdeel = null;
    };

    const handleMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["stadsdelen-fill"],
      });
      hoveredStadsdeel =
        features.length > 0 ? features[0].properties?.Stadsdeel : null;
    };

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["stadsdelen-fill"],
      });
      if (features.length > 0) {
        const newSelection = features[0].properties?.Stadsdeel;
        selectedStadsdeel =
          selectedStadsdeel === newSelection ? null : newSelection;
      } else {
        selectedStadsdeel = null;
      }
    };

    map.on("mouseenter", "stadsdelen-fill", handleMouseEnter);
    map.on("mouseleave", "stadsdelen-fill", handleMouseLeave);
    map.on("mousemove", "stadsdelen-fill", handleMouseMove);
    map.on("click", () => (selectedStadsdeel = null));
    map.on("click", "stadsdelen-fill", handleClick);

    return () => {
      map.off("mouseenter", "stadsdelen-fill", handleMouseEnter);
      map.off("mouseleave", "stadsdelen-fill", handleMouseLeave);
      map.off("mousemove", "stadsdelen-fill", handleMouseMove);
      map.off("click", "stadsdelen-fill", handleClick);
    };
  });

  $effect(() => {
    const map = mapCtx?.getMap();
    if (!map || !mapCtx?.isLoaded()) return;

    if (selectedStadsdeel) {
      map.setPaintProperty("stadsdelen-fill", "fill-opacity", [
        "case",
        ["==", ["get", "Stadsdeel"], selectedStadsdeel],
        0.8,
        0.1,
      ]);

      map.setPaintProperty("stadsdelen-outline", "line-opacity", [
        "case",
        ["==", ["get", "Stadsdeel"], selectedStadsdeel],
        1,
        0.2,
      ]);
    } else {
      map.setPaintProperty("stadsdelen-fill", "fill-opacity", 0.2);
      map.setPaintProperty("stadsdelen-outline", "line-opacity", 1);
    }
  });

  function toggleLayer() {
    const map = mapCtx?.getMap();
    if (!map) return;
    const visibility = isLayerVisible ? "none" : "visible";
    map.setLayoutProperty("stadsdelen-fill", "visibility", visibility);
    map.setLayoutProperty("stadsdelen-outline", "visibility", visibility);
    isLayerVisible = !isLayerVisible;
  }

  setTimeout(() => toggleLayer(), 500);
</script>
