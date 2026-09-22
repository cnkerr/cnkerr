import fs from "node:fs";

const source = JSON.parse(fs.readFileSync(new URL("../notes/projects/flatground-tricks-source.json", import.meta.url), "utf8"));
const byPart = [...new Map(source.map(d => [d.part, d.url])).entries()].sort((a,b)=>a[0]-b[0]);

for (const [part,url] of byPart) {
  const id = new URL(url).searchParams.get("v");
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const oembed = await fetch(oembedUrl, {headers:{"user-agent":"Mozilla/5.0"}});
  let title="";
  try { if(oembed.ok) title=(await oembed.json()).title||""; } catch {}

  const embedUrl = `https://www.youtube.com/embed/${id}?start=1&end=5&rel=0&enablejsapi=1&playsinline=1&origin=https%3A%2F%2Fcnkerr.com`;
  const embed = await fetch(embedUrl,{headers:{"user-agent":"Mozilla/5.0"}});
  const body = await embed.text();

  const statuses=[...body.matchAll(/"status"\s*:\s*"([^"]+)"/g)].map(m=>m[1]).slice(0,10);
  const reasons=[...body.matchAll(/"reason"\s*:\s*"([^"]+)"/g)].map(m=>m[1]).slice(0,5);
  const marker = {
    videoUnavailable:/Video unavailable/i.test(body),
    embeddingDisabled:/Playback on other websites has been disabled/i.test(body),
    loginRequired:/LOGIN_REQUIRED/.test(body),
    unplayable:/UNPLAYABLE/.test(body),
    error:/\"status\"\s*:\s*\"ERROR\"/.test(body)
  };
  console.log(JSON.stringify({part,id,title,oembed:oembed.status,embed:embed.status,bytes:body.length,duration,maxOnset,secondsRemaining:duration?duration-maxOnset:null,statuses,reasons,marker}));
}
