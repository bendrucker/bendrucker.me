import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../fonts";

export default async (stats) => {
  const textContent = [
    SITE.title,
    "GitHub Activity",
    `${stats.repos} repos`,
    `${stats.prs} PRs`,
    `${stats.reviews} reviews`,
    `${stats.issues} issues`,
    stats.languages.map((l) => l.name).join(""),
    `${stats.years} years`,
    new URL(SITE.website).hostname,
  ].join(" ");

  const languageDots = stats.languages.slice(0, 6).map((lang) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: lang.color || "#888",
              flexShrink: 0,
            },
          },
        },
        {
          type: "span",
          props: {
            style: { fontSize: 20, color: "#666" },
            children: `${lang.name} (${lang.count})`,
          },
        },
      ],
    },
  }));

  const statItems = [
    { label: "Repos", value: stats.repos },
    { label: "PRs", value: stats.prs },
    { label: "Reviews", value: stats.reviews },
    { label: "Issues", value: stats.issues },
  ].map((item) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      },
      children: [
        {
          type: "span",
          props: {
            style: { fontSize: 48, fontWeight: "bold", color: "#000" },
            children: String(item.value),
          },
        },
        {
          type: "span",
          props: {
            style: { fontSize: 18, color: "#666" },
            children: item.label,
          },
        },
      ],
    },
  }));

  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fefbfb",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "48px 64px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 36,
                      fontWeight: "bold",
                      color: "#000",
                    },
                    children: "GitHub Activity",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { fontSize: 24, color: "#666" },
                    children: `${stats.years} years`,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                flex: 1,
                borderTop: "2px solid #e5e5e5",
                borderBottom: "2px solid #e5e5e5",
                padding: "24px 0",
              },
              children: statItems,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "24px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      gap: "20px",
                      flexWrap: "wrap",
                    },
                    children: languageDots,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 24,
                      fontWeight: "bold",
                      color: "#000",
                    },
                    children: SITE.title,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(textContent),
    },
  );
};
