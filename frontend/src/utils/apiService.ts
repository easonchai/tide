import axios from "axios";
import { serializeBigInt } from "@/utils/bigIntSerializer";
import { CreateUserDTO } from "@/types/user";
import {
  CreateMarketDTO,
  UpdateMarketDTO,
  CreateNFTPositionDTO,
  CloseNFTPositionDTO,
  MarketStatus,
} from "@/types/market";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (config.data) {
      config.data = serializeBigInt(config.data);
    }

    if (config.params) {
      config.params = serializeBigInt(config.params);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiService = {
  user: {
    create: (payload: CreateUserDTO) => api.post("/users", payload),
    getByAddress: (address: string) => api.get(`/users/address/${address}`),
    delete: (address: string) => api.delete(`/users/address/${address}`),
  },
  market: {
    create: (payload: CreateMarketDTO) => api.post("/markets", payload),
    getAll: (params?: { status?: MarketStatus }) =>
      api.get("/markets", { params }),
    getBySlug: (slug: string, params?: { status?: MarketStatus }) =>
      api.get(`/markets/${slug}`, { params }),
    update: (slug: string, payload: UpdateMarketDTO) =>
      api.put(`/markets/${slug}`, payload),
    delete: (slug: string) => api.delete(`/markets/${slug}`),
    createPosition: (payload: CreateNFTPositionDTO) =>
      api.post("/markets/positions", payload),
    getPositionsByUser: (
      address: string,
      params?: { includeClosed?: boolean }
    ) => api.get(`/markets/positions/user/${address}`, { params }),
    getPositionsByMarket: (
      slug: string,
      params?: { includeClosed?: boolean }
    ) => api.get(`/markets/positions/market/${slug}`, { params }),
    closePosition: (id: string, payload: CloseNFTPositionDTO) =>
      api.put(`/markets/positions/${id}/close`, payload),
  },
};
