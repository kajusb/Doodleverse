import { Collection, ObjectId, type Sort } from "mongodb";
import { DATABASE_NAME } from "@/lib/database";
import clientPromise from "@/lib/mongodb";
import type { Generation } from "@/types/Generation";
const COLLECTION_NAME = "generations";

type GenerationDocument = Omit<Generation, "_id"> & {
  _id: ObjectId;
};

type CreateGenerationInput = Omit<
  Generation,
  "_id" | "userId" | "createdAt" | "updatedAt"
>;

function serializeGeneration(document: GenerationDocument): Generation {
  return {
    ...document,
    _id: document._id.toHexString(),
  };
}

async function getCollection(): Promise<Collection<GenerationDocument>> {
  const client = await clientPromise;
  return client.db(DATABASE_NAME).collection<GenerationDocument>(COLLECTION_NAME);
}

export function isValidGenerationId(id: string): boolean {
  return ObjectId.isValid(id);
}

export async function createGeneration(
  userId: string,
  input: CreateGenerationInput,
): Promise<Generation> {
  const collection = await getCollection();
  const existingDocument = await collection.findOne({
    userId,
    generatedModelUrl: input.generatedModelUrl,
  });

  if (existingDocument) {
    return serializeGeneration(existingDocument);
  }

  const timestamp = new Date();

  const document: Omit<GenerationDocument, "_id"> = {
    userId,
    title: input.title.trim() || "Untitled world",
    originalImageUrl: input.originalImageUrl,
    generatedModelUrl: input.generatedModelUrl,
    generatedThumbnailUrl: input.generatedThumbnailUrl,
    audioUrl: input.audioUrl ?? null,
    theme: input.theme?.trim() || "unknown",
    meshyTaskId: input.meshyTaskId?.trim() || null,
    status: input.status ?? "completed",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const result = await collection.insertOne(document as GenerationDocument);
  return serializeGeneration({ ...document, _id: result.insertedId });
}

export async function listGenerationsForUser(userId: string): Promise<Generation[]> {
  const collection = await getCollection();
  const sort: Sort = { createdAt: -1 };
  const documents = await collection.find({ userId }).sort(sort).toArray();

  return documents.map(serializeGeneration);
}

export async function getGenerationByIdForUser(
  id: string,
  userId: string,
): Promise<Generation | null> {
  const collection = await getCollection();
  const document = await collection.findOne({ _id: new ObjectId(id), userId });
  return document ? serializeGeneration(document) : null;
}

export async function deleteGenerationByIdForUser(
  id: string,
  userId: string,
): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount === 1;
}