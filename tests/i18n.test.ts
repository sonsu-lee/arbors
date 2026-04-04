import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { loadMessages } from "../src/i18n/index";

describe("i18n", () => {
  beforeEach(() => {
    vi.stubEnv("LANG", "");
    vi.stubEnv("LANGUAGE", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("should load English messages by default", async () => {
    // Given: no language configured and no LANG env
    // When: messages are loaded without config
    const messages = await loadMessages();

    // Then: English messages are returned
    expect(messages.selectProject).toBe("Select a project:");
  });

  test("should load Korean messages when configured", async () => {
    // Given: language is set to ko
    // When: messages are loaded with ko config
    const messages = await loadMessages("ko");

    // Then: Korean messages are returned
    expect(messages.selectProject).toBe("프로젝트를 선택하세요:");
  });

  test("should load Japanese messages when configured", async () => {
    // Given: language is set to ja
    // When: messages are loaded with ja config
    const messages = await loadMessages("ja");

    // Then: Japanese messages are returned
    expect(messages.selectProject).toBe("プロジェクトを選択してください:");
  });

  test("should detect language from LANG env variable", async () => {
    // Given: LANG is set to ko_KR.UTF-8
    vi.stubEnv("LANG", "ko_KR.UTF-8");

    // When: messages are loaded without explicit config
    const messages = await loadMessages();

    // Then: Korean is detected and loaded
    expect(messages.selectProject).toBe("프로젝트를 선택하세요:");
  });

  test("should handle resultsFound with correct pluralization", async () => {
    // Given: English messages
    const messages = await loadMessages("en");

    // When: resultsFound is called with 1 and 3
    const singular = messages.resultsFound(1);
    const plural = messages.resultsFound(3);

    // Then: pluralization is correct
    expect(singular).toBe("1 result found");
    expect(plural).toBe("3 results found");
  });

  test("should fall back to English for unknown locale", async () => {
    // Given: LANG is set to an unsupported language
    vi.stubEnv("LANG", "fr_FR.UTF-8");

    // When: messages are loaded
    const messages = await loadMessages();

    // Then: falls back to English
    expect(messages.selectProject).toBe("Select a project:");
  });
});
