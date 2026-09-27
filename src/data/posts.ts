// Blog post metadata, shared by /blog and each post page.
export const posts = [
  {
    slug: "getting-the-best-out-of-jev",
    title: "Getting the best out of Jev",
    subtitle:
      "What rebuilding an item identifier taught me about System One models: where they shine, and the architecture it takes to get there.",
    description:
      "A field report from rebuilding an item identifier on Jev, TypeSafe's System One model: cheaper tokens vs cheaper requests, what confidence means, catalogue duplicates, numbers in natural language, evaluating probabilistic code, and running it in production.",
    published: "2026-09-27",
    readingMinutes: 24,
    tags: ["Jev", "System One", "Applied AI", "Evaluation"],
  },
] as const;

export type Post = (typeof posts)[number];
