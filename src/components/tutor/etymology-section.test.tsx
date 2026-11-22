import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ShuowenSection } from "./etymology-section";
import type { EtymologyEntry } from "@/lib/etymology";

const entry: EtymologyEntry = {
  id: "shuowen:941",
  sourceId: "shuowen",
  headword: "舌",
  contentKind: "historical-dictionary",
  language: "lzh",
  text: "在口所以言也。",
  reviewStatus: "unreviewed-source-material",
  sourceUrl: "https://example.test/source/941",
  translation: {
    language: "en",
    text: "That within the mouth by which one speaks.",
    method: "ai-generated",
    reviewStatus: "unreviewed-ai-draft",
    uncertain: false,
    sourceTextSha256: "a".repeat(64),
  },
};

describe("Shuowen source and English disclosure", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it("shows labeled English while preserving Chinese behind its remembered toggle", () => {
    const { unmount } = render(<ShuowenSection entries={[entry]} />);
    expect(screen.getByText(entry.translation!.text)).toHaveAttribute("lang", "en");
    expect(screen.getByText(/AI-generated draft, not reviewed/)).toBeVisible();
    expect(screen.queryByText(entry.text)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(entry.text)).toHaveAttribute("lang", "lzh");
    expect(screen.getByText(entry.translation!.text)).toBeVisible();
    unmount();
    render(<ShuowenSection entries={[entry]} />);
    expect(screen.getByText(entry.text)).toBeVisible();
  });
  it("keeps duplicate headwords independent and flags the uncertain passage", () => {
    const second: EtymologyEntry = {
      ...entry,
      id: "shuowen:1437",
      text: "別條原文。",
      translation: {
        ...entry.translation!,
        text: "A separate source explanation.",
        uncertain: true,
      },
    };
    const { container } = render(<ShuowenSection entries={[entry, second]} />);
    expect(container.querySelector('[data-source-entry="shuowen:941"]')).toHaveTextContent(
      entry.translation!.text,
    );
    expect(container.querySelector('[data-source-entry="shuowen:1437"]')).toHaveTextContent(
      second.translation!.text,
    );
    expect(screen.getByText(/This passage is uncertain/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(entry.text)).toBeVisible();
    expect(screen.getByText(second.text)).toBeVisible();
  });
  it("retains access to the original when no usable English draft is available", () => {
    const { translation: _translation, ...original } = entry;
    render(<ShuowenSection entries={[original]} />);
    expect(screen.queryByText(/AI-generated draft/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(entry.text)).toBeVisible();
    expect(screen.queryByText(/English drafts above/)).toBeNull();
  });
  it("discloses a different editorial headword and preserves both Chinese readings", () => {
    const reviewed: EtymologyEntry = {
      ...entry,
      id: "shuowen:2118",
      headword: "钉",
      text: "蔽人視也。",
      translation: {
        ...entry.translation!,
        text: "To obstruct another person's view.",
        editorialReview: {
          reviewId: "test-review",
          status: "partial-editorial-review",
          changes: ["translation", "source-reading"],
          sourceReading: {
            headword: "䀘",
            text: "蔽人視也。",
            textSha256: "b".repeat(64),
            classification: "verified_alternative_witness",
            note: "The supplied review identifies the eye-radical headword.",
            evidenceUrls: ["https://example.test/witness"],
          },
        },
      },
    };
    render(<ShuowenSection entries={[reviewed]} />);
    expect(screen.getByText(/partial editorial corrections; not fully verified/)).toBeVisible();
    expect(screen.getByText(/Review headword:/)).toHaveTextContent("䀘");
    expect(screen.getByText(/Review headword:/)).toHaveTextContent("钉");
    expect(screen.queryByText(reviewed.text)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(reviewed.text)).toBeVisible();
    expect(screen.getByText("䀘 — 蔽人視也。")).toBeVisible();
    expect(screen.getByText(/The supplied review identifies/)).toBeVisible();
  });
  it("attributes a retained uncertainty assessment to the supplied reviewer", () => {
    const reviewed: EtymologyEntry = {
      ...entry,
      translation: {
        ...entry.translation!,
        uncertain: true,
        editorialReview: {
          reviewId: "external-v3-test",
          status: "partial-editorial-review",
          changes: ["review-assessment"],
          caseEvidence: {
            decision: "checked_retained",
            checkedInSuppliedReview: true,
            reviewerNote: "The final quoted phrase remains unresolved in the supplied commentary.",
            sourceUrls: ["https://example.test/entry"],
          },
        },
      },
    };
    render(<ShuowenSection entries={[reviewed]} />);
    expect(screen.getByText(/This passage is uncertain/)).toBeVisible();
    expect(screen.queryByText(/The final quoted phrase remains/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(/Supplied reviewer assessment/)).toHaveTextContent(
      "uncertainty retained",
    );
    expect(screen.getByText(/The final quoted phrase remains/)).toBeVisible();
  });
});
