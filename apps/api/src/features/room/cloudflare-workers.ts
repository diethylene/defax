/** The Durable Object base class the Worker runtime provides. */
export abstract class DurableObject<Env = unknown, Props = unknown> {
  /** Durable Object state handed to the instance by the runtime. */
  protected readonly ctx: DurableObjectState<Props>;
  /** Bindings and vars configured for the Worker. */
  protected readonly env: Env;

  /**
   * Stores the runtime's state and environment.
   * @param ctx Durable Object state.
   * @param env Bindings and vars for the Worker.
   */
  constructor(ctx: DurableObjectState<Props>, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
