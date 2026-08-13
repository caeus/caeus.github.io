declare const BRAND: unique symbol
export interface BindingConstraint<T> {
    [BRAND]?: () => T
}
export type BindingKey<T> = symbol & BindingConstraint<T>

type BindingKeys = [...BindingKey<unknown>[]]
type DerefMany<Deps extends BindingKeys> = Deps extends [BindingKey<infer To>, ...infer Tail extends BindingKeys]
    ? [To, ...DerefMany<Tail>]
    : Deps extends []
      ? []
      : Deps extends BindingKey<infer Of>[]
        ? Of[]
        : never

type UAsyncBuilder<T> = (...params: unknown[]) => Promise<T>
type Fun2R<Params extends unknown[], R> = (...params: Params) => Promise<R> | R
type Class2R<Params extends unknown[], R> = new (...params: Params) => R

export type Creator<T> = { deps: BindingKeys; create: UAsyncBuilder<T> }

export namespace Creator {
    export function fromFun<Keys extends BindingKeys, R>(deps: [...Keys], fun: Fun2R<DerefMany<Keys>, R>): Creator<R> {
        return {
            deps,
            async create(...params): Promise<R> {
                return fun(...(params as DerefMany<Keys>))
            },
        }
    }
    export function fromClass<Keys extends BindingKeys, R>(deps: [...Keys], cls: Class2R<DerefMany<Keys>, R>): Creator<R> {
        return {
            deps,
            async create(...params): Promise<R> {
                return new cls(...(params as DerefMany<Keys>))
            },
        }
    }
}

export class Container {
    private instances: Record<symbol, Promise<unknown>> = {}
    constructor(private readonly bindings: Record<symbol, Creator<unknown>> = {}) {}

    private async obtain<T>(key: BindingKey<T>, trace: BindingKeys): Promise<T> {
        if (key in this.instances) return this.instances[key] as Promise<T>
        if (!(key in this.bindings)) throw new Error(`No binding for key ${String(key)}`)
        const newTrace = [key, ...trace]
        if (trace.includes(key)) throw new Error(`Circular dependency: ${newTrace.map((k) => k.description).join(' -> ')}`)
        const creator = this.bindings[key]!
        const params = await Promise.all(creator.deps.map((dep) => this.obtain(dep, newTrace)))
        const instance = Promise.resolve(creator.create(...params))
        this.instances[key] = instance
        return instance as Promise<T>
    }

    get<T>(key: BindingKey<T>): Promise<T> {
        return this.obtain(key, [])
    }
}

export interface BindingSlot<T> {
    to(creator: Creator<T>): Module
    toFun<Deps extends BindingKeys>(deps: [...Deps], fun: Fun2R<DerefMany<Deps>, T>): Module
    toClass<Deps extends BindingKeys>(deps: [...Deps], cls: Class2R<DerefMany<Deps>, T>): Module
    toValue(value: T): Module
}

class DefaultBindingSlot<T> implements BindingSlot<T> {
    constructor(
        private readonly key: BindingKey<T>,
        private readonly bindings: Record<symbol, Creator<unknown>>
    ) {}
    to(creator: Creator<T>): Module {
        return new Module({ ...this.bindings, [this.key]: creator })
    }
    toFun<Deps extends BindingKeys>(deps: [...Deps], fun: Fun2R<DerefMany<Deps>, T>): Module {
        return this.to(Creator.fromFun(deps, fun))
    }
    toClass<Deps extends BindingKeys>(deps: [...Deps], cls: Class2R<DerefMany<Deps>, T>): Module {
        return this.to(Creator.fromClass(deps, cls))
    }
    toValue(value: T): Module {
        return this.to(Creator.fromFun([], async () => value))
    }
}

export class Module {
    readonly #bindings: Record<symbol, Creator<unknown>>
    constructor(bindings: Record<symbol, Creator<unknown>> = {}) {
        this.#bindings = bindings
    }

    bind<T>(key: BindingKey<T>): BindingSlot<T> {
        return new DefaultBindingSlot(key, this.#bindings)
    }

    merge(first: Module, ...rest: Module[]): Module {
        return new Module(Object.assign({}, this.#bindings, first.#bindings, ...rest.map((m) => m.#bindings)))
    }

    build(): Container {
        return new Container(this.#bindings)
    }
}

export const createKey = <T>(description: string): BindingKey<T> => Symbol(description) as BindingKey<T>
export const createModule = (...modules: Module[]): Module => new Module().merge(new Module(), ...modules)

export class AsyncDisposeStack {
    private readonly finalizers: Array<() => Promise<void>> = []
    defer(fn: () => Promise<void>): void {
        this.finalizers.push(fn)
    }
    async dispose(): Promise<void> {
        for (const fn of this.finalizers.splice(0).reverse()) await fn()
    }
}
