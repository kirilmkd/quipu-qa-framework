import axios from "axios";
import config from "./regionConfig";

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
  }

  async getAccount(accountId: string) {
    return axios.get(`${this.baseUrl}/accounts/${accountId}`);
  }

  async createCustomer(data: any) {
    return axios.post(`${this.baseUrl}/customers`, data);
  }
}
