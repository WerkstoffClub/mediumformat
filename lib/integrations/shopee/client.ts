// Shopee Open Platform client. MVP-4.
// Docs: https://open.shopee.com/documents

export const shopee = {
  async getItemList(): Promise<unknown> {
    throw new Error("Shopee integration: implement in MVP-4");
  },
  async updateStock(_payload: unknown): Promise<unknown> {
    throw new Error("Shopee integration: implement in MVP-4");
  },
  async fetchOrders(_since: Date): Promise<unknown> {
    throw new Error("Shopee integration: implement in MVP-4");
  },
};
