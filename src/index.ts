type MinimalAsset = {
	url: string;
	name: string;
};

const homepage = `
	              thrzl/latest

	    this is a small cloudflare worker that
	will redirect to a release asset matching
	a query

	you can use it like this:

	/{user}/{repo}?q=...

	where the \`q\` parameter is a substring to
	search for. for example:

	/thrzl/chiffrage?q=setup.exe

	will match any release asset that contains
	\`setup.exe\`, which in my case would match
	\`chiffrage_vX.X.X_setup.exe\`

`;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (['/', ''].includes(url.pathname)) {
			return new Response(homepage);
		}
		const repo = url.pathname.slice(1);
		const query = url.searchParams.get('q');
		if (!repo.match(/^(\w|\d|-)+\/(\w|\d|-)+$/g)) {
			return new Response('this is not a valid repository');
		}
		if (query === null || query.length === 0) {
			return new Response("you didn't set a query");
		}
		const res = await fetch(`http://api.github.com/repos/${repo}/releases/latest`, { headers: { 'User-Agent': 'thrzl/latest 0.1.0' } });
		if (res.status !== 200) {
			return new Response(`sum went wrong gangalang: ${res.statusText}`);
		}
		const data: { assets: any[] } = await res.json();
		const assets: MinimalAsset[] = data.assets.map((asset) => ({ name: asset.name, url: asset.browser_download_url }));
		const matchingAsset = assets.find((asset) => asset.name.includes(query));
		if (!matchingAsset) {
			return new Response('', { status: 404, statusText: 'failed to find release asset matching that query' });
		}
		return Response.redirect(matchingAsset.url);
	},
} satisfies ExportedHandler<Env>;
