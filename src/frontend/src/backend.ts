// Stub backend for frontend-only AdReward app
export interface backendInterface {
  _initializeAccessControlWithSecret: (token: string) => Promise<void>;
}

export interface CreateActorOptions {
  agentOptions?: Record<string, unknown>;
}

export class ExternalBlob {
  static fromURL(_url: string): ExternalBlob {
    return new ExternalBlob();
  }
  getBytes(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array());
  }
  onProgress?: (progress: number) => void;
}

export async function createActor(
  _canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (bytes: Uint8Array) => Promise<ExternalBlob>,
  _options?: CreateActorOptions,
): Promise<backendInterface> {
  return {
    _initializeAccessControlWithSecret: async () => {},
  };
}
