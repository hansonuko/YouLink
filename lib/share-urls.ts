/** External compose URLs for the ShareSheet's non-native channels. */
export function getShareUrl(
  channel: "x" | "linkedin" | "whatsapp" | "email",
  url: string,
  title: string,
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  switch (channel) {
    case "x":
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    case "email":
      return `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
  }
}
