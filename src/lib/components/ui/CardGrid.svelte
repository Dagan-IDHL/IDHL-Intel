<script>
	export let cols = 3;
</script>

<div
	class="grid grid-cols-1 gap-4"
	class:md:grid-cols-2={cols >= 2}
	class:xl:grid-cols-3={cols >= 3}
	class:2xl:grid-cols-4={cols >= 4}
>
	<slot />
</div>
