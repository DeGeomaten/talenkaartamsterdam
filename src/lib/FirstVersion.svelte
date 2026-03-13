<script lang="ts">
  import {
    Map,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MarkerTooltip,
  } from "$lib/components/ui/map";
  import { Button } from "$lib/components/ui/button";
  import MarkerLabel from "$lib/components/ui/map/MarkerLabel.svelte";
  import { scale } from "svelte/transition";

  import * as XLSX from "xlsx";

  let map2 = $state();

  let colored = $state(false);
  let labels = $state(false);
  let hoveredLanguage = $state(null);

  const locations = [];

  const colorMap: Record<string, string> = {
    Nederlands: "bg-blue-500",
    Engels: "bg-red-500",
    Arabisch: "bg-green-500",
    Turks: "bg-orange-500",
    Spaans: "bg-yellow-500",
    Duits: "bg-purple-500",
    Berbers: "bg-emerald-500",
    Frans: "bg-pink-500",
    "Toki pona": "bg-indigo-500",
    Hongaars: "bg-cyan-500",
  };

  async function postcodeToCoords(pc) {
    pc = pc.replace(/\s+/g, "").toUpperCase();

    const url = new URL(
      "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free",
    );
    url.searchParams.set("fq", `postcode=${pc}`);
    url.searchParams.append("fq", "type:adres");
    url.searchParams.set("fl", "centroide_ll");
    url.searchParams.set("rows", "1");

    const res = await fetch(url);
    const json = await res.json();

    const docs = json.response?.docs;
    if (!docs || docs.length === 0) return null;

    const point = docs[0].centroide_ll;
    const [lon, lat] = point.slice(6, -1).split(" ").map(Number);

    return { lat, lon };
  }

  async function load() {
    const res = await fetch("./data.xlsx");
    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const header = rows[1];
    const dataRows = rows.slice(2);

    const data = dataRows.map((row) =>
      Object.fromEntries(header.map((key, i) => [key, row[i]])),
    );

    data.forEach((i) => {
      i.geo = postcodeToCoords(i["Postcode"] + "");
      i.geo.then((coords) => {
        if (!coords) return;
        locations.push({
          id: locations.length + 1,
          lng: coords.lon + Math.random() * 0.01 - 0.005,
          lat: coords.lat,
          language: "Nederlands",
          ...i,
        });
      });
    });

    console.log(data);
  }

  let stadsdelen = $state([]);

  async function loadStadsdelen() {
    const res = await fetch("/stadsdelen.json");
    stadsdelen = await res.json();
  }

  $effect(() => {
    load();
    loadStadsdelen();
  });

  setTimeout(() => {
    console.log(map2);
  }, 5000);
</script>

<title>Languages of Amsterdam</title>

<link rel="stylesheet" href="https://use.typekit.net/bis1pqi.css" />

<div class="space-y-4">
  <div class="flex items-center justify-between px-2">
    <h2 class="text-lg font-[800] text-[#633]">
      <i class="font-[600]">Languages of </i><br />
      <span class="text-[32px] text-[#111]">Amsterdam</span>
    </h2>
    <div>
      <button
        onclick={() => (colored = !colored)}
        class="px-4 mx-1 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
      >
        {colored ? "Toon standaard kleur" : "Kleur op basis van taal"}
      </button>

      <button
        onclick={() => (labels = !labels)}
        class="px-4 mx-1 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
      >
        {labels ? "Verberg labels" : "Toon labels"}
      </button>
    </div>
  </div>

  <div
    class="h-[600px] w-(calc(100% - 60px)) m-7.5 border rounded-xl overflow-hidden shadow-sm relative"
  >
    <Map bind:this={map2} center={[4.8952, 52.3702]} zoom={12}>
      {#each locations as location (location.id)}
        <MapMarker
          longitude={location.lng}
          latitude={location.lat}
          onmouseenter={() => {
            hoveredLanguage = location.language;
          }}
          onmouseleave={() => (hoveredLanguage = null)}
        >
          <MarkerContent>
            <div
              class="transition-opacity duration-250"
              class:opacity-25={hoveredLanguage &&
                hoveredLanguage !== location.language}
            >
              <div
                class="size-4 rounded-full border-2 border-white shadow-lg transition-all duration-300
							{colored
                  ? colorMap[location.language] || 'bg-gray-500'
                  : location.language == hoveredLanguage
                    ? 'bg-[#f42]'
                    : 'bg-[#830]'}"
              ></div>
              {#if labels || hoveredLanguage === location.language}
                <div transition:scale={{ duration: 200 }}>
                  <MarkerLabel position="bottom"
                    >{location.language}</MarkerLabel
                  >
                </div>
              {/if}
            </div>
          </MarkerContent>
          <MarkerTooltip>
            Taal: {location.language}
          </MarkerTooltip>
          <MarkerPopup>
            <div class="p-1">
              <p class="font-bold text-sm">Gesproken taal:</p>
              <p class="text-blue-600 font-medium">{location.language}</p>
            </div>
          </MarkerPopup>
        </MapMarker>
      {/each}
    </Map>

    {#if colored}
      <div
        class="absolute bottom-4 left-4 bg-white/90 p-2 rounded-lg shadow-md text-[10px] grid grid-cols-2 gap-x-4 gap-y-1 border"
      >
        {#each Object.entries(colorMap) as [lang, color]}
          <div class="flex items-center gap-2">
            <div class="size-2 rounded-full {color}"></div>
            <span>{lang}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if hoveredLanguage}
  {@const count = locations.filter(
    (loc) => loc.language === hoveredLanguage,
  ).length}
  <div
    class="fixed bottom-25 right-1/2 translate-x-1/2 bg-white/90 p-3 rounded-lg shadow-md border text-sm"
    transition:scale={{ duration: 200 }}
  >
    <p class="font-medium">
      <span class="font-bold">{hoveredLanguage}</span> komt
      <strong>{count}</strong> keer voor in Amsterdam.
    </p>
  </div>
{/if}

<style>
  h2 {
    font-family: "ivypresto-display", serif;
    font-size: 22px;
  }
</style>
