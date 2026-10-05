import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/httpRequest", () => ({ default: { get: vi.fn() } }));

import { HistoryAPI } from "@/api/historyApi";
import httpRequest from "@/utils/httpRequest";

const get = vi.mocked(httpRequest.get);

beforeEach(() => {
  get.mockReset();
});

describe("HistoryAPI", () => {
  it("list sends beforeSeq and limit to GET /board/{id}/history", async () => {
    get.mockResolvedValue({ data: [{ txId: "t1" }] } as never);
    await expect(HistoryAPI.list("b1", 40, 10)).resolves.toEqual([{ txId: "t1" }]);
    expect(get).toHaveBeenCalledWith("/board/b1/history", { params: { beforeSeq: 40, limit: 10 } });
  });
  it("list without beforeSeq omits it and defaults limit to 30", async () => {
    get.mockResolvedValue({ data: [] } as never);
    await HistoryAPI.list("b1");
    const params = (get.mock.calls[0][1] as { params: Record<string, number> }).params;
    expect(params).toStrictEqual({ limit: 30 });
  });
  it("state sends seq to GET /board/{id}/history/state", async () => {
    get.mockResolvedValue({ data: { seq: 5, elements: [] } } as never);
    await expect(HistoryAPI.state("b1", 5)).resolves.toEqual({ seq: 5, elements: [] });
    expect(get).toHaveBeenCalledWith("/board/b1/history/state", { params: { seq: 5 } });
  });
});
