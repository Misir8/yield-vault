import { Injectable } from "@nestjs/common";
import { AxiosInstance } from "axios";

import { INDEXER } from "config";

import { X_API_KEY } from "@libs/auth";
import { AxiosService } from "@libs/axios";
import {
  INDEXER_PRIVATE_EVENTS_URL,
  INDEXER_PRIVATE_EVENTS_TYPE_URL,
  INDEXER_PRIVATE_EVENTS_BLOCK_URL,
  INDEXER_PRIVATE_EVENTS_TX_URL,
} from "@libs/constants/routes";
import { ApiErrorHandler } from "@libs/exceptions";
import {
  EventDTO,
  GetEventsByTypeInput,
  GetEventsByBlockInput,
  GetEventsByTransactionInput,
} from "@libs/indexer-types";

@Injectable()
export class EventsProviderService extends ApiErrorHandler {
  private readonly axiosInstance: AxiosInstance;

  constructor() {
    super();
    this.axiosInstance = new AxiosService().createInstance({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        [X_API_KEY]: INDEXER.X_API_KEY,
      },
    });
  }

  async getRecentEvents(limit: number = 100): Promise<EventDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_EVENTS_URL}`;
      const response = await this.axiosInstance.get<EventDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getRecentEvents.name, err);
    }
  }

  async getEventsByType({
    eventType,
    limit = 100,
  }: GetEventsByTypeInput): Promise<EventDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_EVENTS_URL}/${INDEXER_PRIVATE_EVENTS_TYPE_URL.replace(":eventType", eventType)}`;
      const response = await this.axiosInstance.get<EventDTO[]>(url, {
        params: { limit },
      });
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getEventsByType.name, err);
    }
  }

  async getEventsByBlock({
    blockNumber,
  }: GetEventsByBlockInput): Promise<EventDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_EVENTS_URL}/${INDEXER_PRIVATE_EVENTS_BLOCK_URL.replace(":blockNumber", blockNumber)}`;
      const response = await this.axiosInstance.get<EventDTO[]>(url);
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getEventsByBlock.name, err);
    }
  }

  async getEventsByTransaction({
    transactionHash,
  }: GetEventsByTransactionInput): Promise<EventDTO[]> {
    try {
      const url = `${INDEXER.URL}/${INDEXER_PRIVATE_EVENTS_URL}/${INDEXER_PRIVATE_EVENTS_TX_URL.replace(":transactionHash", transactionHash)}`;
      const response = await this.axiosInstance.get<EventDTO[]>(url);
      return response.data;
    } catch (err: unknown) {
      this.handleError(this.getEventsByTransaction.name, err);
    }
  }
}
