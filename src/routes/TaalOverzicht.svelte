<script lang="ts">
  import Card from "$lib/components/ui/card/card.svelte";

  let { observations, locale, allObservations } = $props();

  function makeDisplayName(code: string, locale: string) {
    return observations.find((o) => o.code === code)?.displayName;
  }
</script>

<Card class="mx-5 mb-5 p-5">
  {#if observations}
    {@const colors = [
      "hsl(205, 100%, 37%)",
      "hsl(45, 100%, 50%)",
      "hsl(270, 100%, 50%)",
      "hsl(120, 100%, 50%)",
      "hsl(195, 100%, 50%)",
      "hsl(20, 100%, 50%)",
      "hsl(240, 100%, 50%)",
      "hsl(48, 50%, 50%)",
      "hsl(340, 80%, 50%)",
    ]}

    {@const grouped = globalThis.Map.groupBy(
      observations,
      (o) => o.observationId,
    )}

    {@const num = grouped.size}

    {@const langs = Array.from(new Set(observations.map((o) => o.code)))
      .map((code) => {
        const occ = [...grouped.values()].filter((obs) =>
          obs.some((o) => o.code === code),
        ).length;
        return {
          code,
          occ,
          pcntg: (occ / num) * 100,
        };
      })
      .sort((a, b) => b.occ - a.occ)}

    {@const coTalen = new globalThis.Map(
      langs.map(({ code }) => {
        const ids = [...grouped.entries()]
          .filter(([_, obs]) => obs.some((o) => o.code === code))
          .map(([id]) => id);
        const companions = ids
          .flatMap((id) => grouped.get(id) ?? [])
          .filter((o) => o.code !== code)
          .map((o) => o.code);
        const counts = globalThis.Map.groupBy(companions, (c) => c);
        const top = [...counts.entries()]
          .map(([c, arr]) => ({ code: c, count: arr.length }))
          .sort((a, b) => b.count - a.count);
        const topCode = top[0]?.code ?? null;
        const topPcntg = top[0] ? (top[0].count / ids.length) * 100 : 0;
        return [code, { topCode, topPcntg, alle: top }];
      }),
    )}

    <div class="flex h-2 overflow-hidden rounded-full bg-gray-200">
      {#each langs as lang, i}
        <div
          class="h-full"
          style={`width: ${lang.pcntg}%; background-color: ${
            colors[Math.min(i, colors.length - 1)]
          }`}
        ></div>
      {/each}
    </div>
    <ul>
      {#each Array.from(langs.sort((a, b) => b.pcntg - a.pcntg)) as lang, i}
        {@const co = coTalen.get(lang.code)}
        {@const coDisplayName = makeDisplayName(co?.topCode ?? "", locale)}

        {#if i == colors.length - 1}
          <span
            style={`color: ${colors[Math.min(langs.indexOf(lang), colors.length - 1)]};`}
            >●</span
          >
          <b><i>Andere talen:</i></b>
          <span class="text-muted-foreground text-[12px]">
            {langs
              .slice(colors.length - 1)
              .reduce((acc, curr) => acc + curr.pcntg, 0)
              .toFixed(1)}%
          </span>
        {/if}
        <li>
          <span
            style={`color: ${colors[Math.min(langs.indexOf(lang), colors.length - 1)]};`}
            style:opacity={i > colors.length - 2 ? 0 : 1}>●</span
          >
          {makeDisplayName(lang.code, "nl")}

          <span class="text-muted-foreground text-[12px]"
            ><b>{lang.pcntg.toFixed(1)}%</b> ({lang.occ} sprekers)</span
          >

          <span class="text-muted-foreground text-[12px]">
            → meest gesproken in combinatie met <b>{coDisplayName}</b>
            ({co?.topPcntg.toFixed(1)}%)</span
          >
        </li>
      {/each}
    </ul>
  {/if}
</Card>
