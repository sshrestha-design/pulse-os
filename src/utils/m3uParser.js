export const parseM3U = (content, fileName) => {
  const lines = content.split('\n');
  const stations = [];
  let tempName = "";

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXTINF:')) {
      tempName = trimmed.split(',')[1] || "Unnamed Station";
    } else if (trimmed.startsWith('http')) {
      stations.push({
        id: crypto.randomUUID(),
        name: tempName || "New Stream",
        url: trimmed,
        genre: "Imported"
      });
      tempName = "";
    }
  });

  return {
    id: crypto.randomUUID(),
    name: fileName.replace(/\.[^/.]+$/, ""),
    stations,
    count: stations.length
  };
};