export interface Generation {
  _id?: string;
  userId: string;
  title: string;
  originalImageUrl?: string;
  generatedModelUrl: string;
  generatedThumbnailUrl?: string;
  audioUrl?: string | null;
  theme?: string;
  meshyTaskId?: string | null;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}