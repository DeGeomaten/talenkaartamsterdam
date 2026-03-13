<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";

  let { onclick, content } = $props();
</script>

<Button variant="outline" size="icon" {onclick}>{@html content}</Button>
