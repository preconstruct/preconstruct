import pLimit from "p-limit";

export let limit = pLimit(1);

export let promptInput = jest.fn();

export let doPromptInput = jest.fn();

export let createPromptConfirmLoader = () => jest.fn();
