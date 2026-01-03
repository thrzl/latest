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

	an optional \`v\` parameter can be used to
	specify a version. for example:

	/thrzl/chiffrage?q=setup.exe&v=v1.6.0

	will match any release asset in release \`v1.6.0\` that contains
	\`setup.exe\`, which in my case would match
	\`chiffrage_vX.X.X_setup.exe\`

`;

const cache = caches.default;

function newError(text: string, status: number) {
	return new Response(text, { status: status });
}

async function getRelease(url: string) {
	let releaseData = await cache.match(url);
	if (releaseData) return releaseData;
	const res = await fetch(url, {
		headers: { 'User-Agent': 'thrzl/latest 0.1.0' },
	});
	if (!url.endsWith('latest') && [200, 301, 302].includes(res.status)) {
		await cache.put(url, res.clone());
	}
	return res;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (['/', ''].includes(url.pathname)) {
			return new Response(homepage);
		}
		const repo = url.pathname.slice(1);
		const query = url.searchParams.get('q');
		const version = url.searchParams.get('v');
		const versionString = version ? `tags/${version}` : 'latest';
		if (!repo.match(/^(\w|\d|-)+\/(\w|\d|-)+$/g)) {
			return newError('this is not a valid repository', 404);
		}
		if (query === null || query.length === 0) {
			return newError("you didn't set a query", 400);
		}
		const res = await getRelease(`https://api.github.com/repos/${repo}/releases/${versionString}`);
		if (res.status === 404) {
			return newError(`failed to find that release`, 404);
		}
		if ([200, 301, 302].includes(res.status)) {
			return newError(`sum went wrong gangalang: ${res.statusText}`, res.status);
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
