export type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export type ClosableServer = {
  close: (cb?: (err?: Error) => void) => void;
};
