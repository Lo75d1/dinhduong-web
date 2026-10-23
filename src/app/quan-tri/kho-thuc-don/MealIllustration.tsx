/* eslint-disable @next/next/no-img-element -- Stable local media endpoint; already resized and re-encoded on upload. */
import { illustrationCaption, menuIllustrationUrl, type MealIllustration as Illustration } from "@/lib/menu-library/illustration";
import styles from "./illustration.module.css";
export default function MealIllustration({ image }: { image?: Illustration | null }) {
  if (!image || !menuIllustrationUrl(image.assetId)) return null;
  return <figure className={styles.figure}>
    <img src={menuIllustrationUrl(image.assetId)} alt={image.alt} loading="lazy" decoding="async" width={1600} height={1200} />
    <figcaption>{illustrationCaption(image.sourceKind)}</figcaption>
  </figure>;
}
