import pLimit from "p-limit";

export let limit = pLimit(1);

export let promptInput = vi.fn();

export let doPromptInput = vi.fn();

export let createPromptConfirmLoader = () => vi.fn();
