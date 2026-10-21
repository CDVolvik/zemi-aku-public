// A direct Qloo journey: no model call and no fallback to name-matched businesses.
export function createDiscovery(artistAnswer) {
  return async function discover(body) {
    const artist = typeof body.artist === "string" ? body.artist.trim() : "";
    if (artist.length < 3 || artist.length > 80 || /[\u0000-\u001f\u007f]/.test(artist)) {
      return { error: "Enter an artist name between 3 and 80 characters." };
    }
    const lang = body.lang === "es" ? "es" : "en";
    const answer = await artistAnswer({ query: artist, town: "" }, artist, lang, [], { exploreOnly: true });
    if (answer) return answer;
    const note = lang === "es"
      ? `Qloo no devolvió lugares relacionados con el gusto por ${artist} en Puerto Rico. Eso no significa que no existan lugares. Pruebe con otro artista.`
      : `Qloo returned no place matches for ${artist} in Puerto Rico. That does not mean there are no places. Try another artist.`;
    return { catalog: true, focus: `${artist} · Puerto Rico`, town: "Puerto Rico", places: [], cards: [], note };
  };
}
