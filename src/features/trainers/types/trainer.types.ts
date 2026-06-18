export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  image: string;
  coverImage: string;
  rating: number;
  clients: number;
  experience: string;
  bio: string;
  videoUrl: string;
  tags: string[];
  trainingStyles: string[];
  benefits: TrainerBenefit[];
  // Either remote URIs or local-bundle asset ids (from require()). Image's
  // source prop accepts both — we use local placeholders while real client
  // photos aren't yet sourced through the API.
  clientAvatars: (string | number)[];
}

export interface TrainerBenefit {
  id: string;
  title: string;
  text: string;
}

export interface TrainerGalleryImage {
  id: string;
  imageUrl: string;
  position: number;
}

export interface TrainerAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}
