// Tokopedia Open API client. MVP-3.
// Docs (for approved Fulfillment Service partners):
//   https://developer.tokopedia.com/openapi/guide/

export const tokopedia = {
  // TODO MVP-3: implement OAuth client_credentials, products, stock, orders.
  async getStockByShop(_shopId: string): Promise<unknown> {
    throw new Error("Tokopedia integration: implement in MVP-3");
  },
  async updateStock(_payload: unknown): Promise<unknown> {
    throw new Error("Tokopedia integration: implement in MVP-3");
  },
  async fetchOrders(_since: Date): Promise<unknown> {
    throw new Error("Tokopedia integration: implement in MVP-3");
  },
};
