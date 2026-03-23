export interface ReferenceImage {
  imageBase64: string;
  mimeType: string;
}

export interface ChannelRef {
  urls: string[];
  handle: string;
}

export interface VideoRef {
  url: string;
}

export interface PreviousVersion {
  imageBase64: string;
  mimeType: string;
  enhancedPrompt: string | null;
}

export async function fetchImages(urls: string[]): Promise<ReferenceImage[]> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Failed to fetch image: ${url}`);
      const buf = await r.arrayBuffer();
      return {
        imageBase64: Buffer.from(buf).toString("base64"),
        mimeType: "image/jpeg",
      } satisfies ReferenceImage;
    }),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<ReferenceImage> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);
}

export function buildImagePrompt({
  safePrompt,
  channelRefs = [],
  channelImageGroups,
  videoRefs = [],
  videoImageGroups,
  referenceImages = [],
  previousVersion,
}: {
  safePrompt: string;
  channelRefs?: ChannelRef[];
  channelImageGroups: ReferenceImage[][];
  videoRefs?: VideoRef[];
  videoImageGroups: ReferenceImage[][];
  referenceImages?: ReferenceImage[];
  previousVersion?: PreviousVersion;
}): { text: string; images: Buffer[] } {
  const allReferenceImages = [
    ...referenceImages,
    ...channelImageGroups.flat(),
    ...videoImageGroups.flat(),
  ];
  const hasReferenceImages = allReferenceImages.length > 0;
  const hasPreviousVersion = !!previousVersion;

  const imageGuide: string[] = [];
  let enriched = safePrompt;
  let imgIdx = hasPreviousVersion ? 2 : 1;

  const userRefCount = referenceImages.length;
  if (userRefCount > 0) {
    const end = imgIdx + userRefCount - 1;
    const range =
      userRefCount === 1 ? `Image ${imgIdx}` : `Images ${imgIdx}–${end}`;
    imageGuide.push(
      `${range}: User-provided visual reference(s) (branding, style, colors, composition).`,
    );
    imgIdx += userRefCount;
  }

  for (const [i, ch] of channelRefs.entries()) {
    const fetchedCount = channelImageGroups[i]?.length ?? 0;
    if (fetchedCount === 0) continue;
    const end = imgIdx + fetchedCount - 1;
    const range =
      fetchedCount === 1 ? `Image ${imgIdx}` : `Images ${imgIdx}–${end}`;
    imageGuide.push(
      `${range}: Thumbnails from @${ch.handle} — use for STYLE ONLY (colors, composition, typography; do NOT copy faces or specific objects).`,
    );
    const pat = new RegExp(
      `@${ch.handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "gi",
    );
    const hint =
      fetchedCount === 1
        ? `@${ch.handle} (image ${imgIdx})`
        : `@${ch.handle} (images ${imgIdx}–${end})`;
    enriched = enriched.replace(pat, hint);
    imgIdx += fetchedCount;
  }

  for (const [i] of videoRefs.entries()) {
    const fetchedCount = videoImageGroups[i]?.length ?? 0;
    if (fetchedCount === 0) continue;
    imageGuide.push(
      `Image ${imgIdx}: Video thumbnail — use for STYLE ONLY (colors, composition, typography; do NOT copy faces or specific objects).`,
    );
    imgIdx++;
  }

  let imagePromptText = enriched;

  if (hasPreviousVersion) {
    const prevLine = hasReferenceImages
      ? `Image 1: Previously generated thumbnail — use as the base to edit.`
      : null;
    const guide = [prevLine, ...imageGuide].filter(Boolean).join("\n");
    imagePromptText = guide
      ? `${guide}\n\nInstruction: ${imagePromptText}`
      : `The attached image is the previously generated thumbnail. Edit and improve it based on this instruction: ${imagePromptText}`;
  } else if (hasReferenceImages) {
    imagePromptText =
      `${imageGuide.join("\n")}\n\n` +
      `Generate a new original YouTube thumbnail.\n\n` +
      `Instruction: ${imagePromptText}`;
  }

  const allImages: Buffer[] = [
    ...(hasPreviousVersion
      ? [Buffer.from(previousVersion.imageBase64, "base64")]
      : []),
    ...(hasReferenceImages
      ? allReferenceImages.map((r) => Buffer.from(r.imageBase64, "base64"))
      : []),
  ];

  return { text: imagePromptText, images: allImages };
}
