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
    expect(screen.getByText(/English: AI draft/)).toBeVisible();
    expect(screen.queryByText(/AI-generated draft, not reviewed/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Source details" }));
    expect(screen.getByText(/AI-generated draft, not reviewed/)).toBeVisible();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
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
    // Only the uncertain passage carries the warning triangle; its popup says it was not checked.
    const marks = screen.getAllByRole("button", { name: "Uncertain translation" });
    expect(marks).toHaveLength(1);
    expect(container.querySelector('[data-source-entry="shuowen:1437"]')).toContainElement(marks[0]!);
    fireEvent.click(marks[0]!);
    expect(screen.getByText("Not checked in the latest review.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(entry.text)).toBeVisible();
    expect(screen.getByText(second.text)).toBeVisible();
  });
  it("retains access to the original when no usable English draft is available", () => {
    const { translation: _translation, ...original } = entry;
    render(<ShuowenSection entries={[original]} />);
    expect(screen.queryByText(/AI draft/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Source details" })).toBeNull();
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
    // Every review note sits in the one (i) popup, not in the visible block.
    expect(screen.queryByText(/Translated for the review headword/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Source details" }));
    expect(screen.getByText(/AI-generated draft, partly reviewed/)).toBeVisible();
    expect(screen.getByText("English partly corrected in a supplied editorial review.")).toBeVisible();
    expect(screen.getByText(/Translated for the review headword/)).toHaveTextContent("䀘");
    expect(screen.getByText(/Translated for the review headword/)).toHaveTextContent("钉");
    expect(screen.getByText(/The supplied review identifies/)).toBeVisible();
    expect(screen.queryByText(reviewed.text)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.getByText(reviewed.text)).toBeVisible();
    expect(screen.getByText("䀘 — 蔽人視也。")).toBeVisible();
  });
  it("labels a revised-but-still-uncertain passage separately from a checked one", () => {
    const revised: EtymologyEntry = {
      ...entry,
      translation: {
        ...entry.translation!,
        uncertain: true,
        editorialReview: {
          reviewId: "external-v3-test",
          status: "partial-editorial-review",
          changes: ["translation", "review-assessment"],
          caseEvidence: { decision: "revised_retained", checkedInSuppliedReview: true, reviewerNote: "Revised wording.", sourceUrls: ["https://example.test/entry"] },
        },
      },
    };
    render(<ShuowenSection entries={[revised]} />);
    fireEvent.click(screen.getByRole("button", { name: "Source details" }));
    expect(screen.getByText(/Supplied reviewer assessment/)).toHaveTextContent("English revised, uncertainty retained");
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
    fireEvent.click(screen.getByRole("button", { name: "Uncertain translation" }));
    expect(screen.getByText("The latest review checked this passage and kept the flag.")).toBeVisible();
    expect(screen.queryByText(/The final quoted phrase remains/)).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Source details" }));
    // An assessment-only review never claims the English was corrected.
    expect(screen.getByText("English unchanged by the supplied editorial review.")).toBeVisible();
    expect(screen.queryByText(/partly corrected/)).toBeNull();
    expect(screen.getByText(/Supplied reviewer assessment/)).toHaveTextContent(
      "checked, English unchanged, uncertainty retained",
    );
    expect(screen.getByText(/The final quoted phrase remains/)).toBeVisible();
    // No editorial reading on this entry, so the Advanced intro never points to one.
    fireEvent.click(screen.getByRole("button", { name: /Original Classical Chinese/ }));
    expect(screen.queryByText(/separate editorial reading/)).toBeNull();
  });
});
