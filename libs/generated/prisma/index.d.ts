/**
 * Client
 **/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types; // general types
import $Public = runtime.Types.Public;
import $Utils = runtime.Types.Utils;
import $Extensions = runtime.Types.Extensions;
import $Result = runtime.Types.Result;

export type PrismaPromise<T> = $Public.PrismaPromise<T>;

/**
 * Model Bus
 * Bus Model
 */
export type Bus = $Result.DefaultSelection<Prisma.$BusPayload>;
/**
 * Model Trip
 *
 */
export type Trip = $Result.DefaultSelection<Prisma.$TripPayload>;

/**
 * Enums
 */
export namespace $Enums {
  export const SeatStartFrom: {
    LEFT: 'LEFT';
    RIGHT: 'RIGHT';
  };

  export type SeatStartFrom =
    (typeof SeatStartFrom)[keyof typeof SeatStartFrom];
}

export type SeatStartFrom = $Enums.SeatStartFrom;

export const SeatStartFrom: typeof $Enums.SeatStartFrom;

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Buses
 * const buses = await prisma.bus.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions
    ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition>
      ? Prisma.GetEvents<ClientOptions['log']>
      : never
    : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] };

  /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Buses
   * const buses = await prisma.bus.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(
    optionsArg?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>,
  );
  $on<V extends U>(
    eventType: V,
    callback: (
      event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent,
    ) => void,
  ): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(
    query: string,
    ...values: any[]
  ): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(
    query: string,
    ...values: any[]
  ): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>;

  $transaction<R>(
    fn: (
      prisma: Omit<PrismaClient, runtime.ITXClientDenyList>,
    ) => $Utils.JsPromise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): $Utils.JsPromise<R>;

  $extends: $Extensions.ExtendsHook<
    'extends',
    Prisma.TypeMapCb<ClientOptions>,
    ExtArgs,
    $Utils.Call<
      Prisma.TypeMapCb<ClientOptions>,
      {
        extArgs: ExtArgs;
      }
    >
  >;

  /**
   * `prisma.bus`: Exposes CRUD operations for the **Bus** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Buses
   * const buses = await prisma.bus.findMany()
   * ```
   */
  get bus(): Prisma.BusDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.trip`: Exposes CRUD operations for the **Trip** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Trips
   * const trips = await prisma.trip.findMany()
   * ```
   */
  get trip(): Prisma.TripDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF;

  export type PrismaPromise<T> = $Public.PrismaPromise<T>;

  /**
   * Validator
   */
  export import validator = runtime.Public.validator;

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError;
  export import PrismaClientValidationError = runtime.PrismaClientValidationError;

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag;
  export import empty = runtime.empty;
  export import join = runtime.join;
  export import raw = runtime.raw;
  export import Sql = runtime.Sql;

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal;

  export type DecimalJsLike = runtime.DecimalJsLike;

  /**
   * Extensions
   */
  export import Extension = $Extensions.UserArgs;
  export import getExtensionContext = runtime.Extensions.getExtensionContext;
  export import Args = $Public.Args;
  export import Payload = $Public.Payload;
  export import Result = $Public.Result;
  export import Exact = $Public.Exact;

  /**
   * Prisma Client JS version: 7.7.0
   * Query Engine version: 75cbdc1eb7150937890ad5465d861175c6624711
   */
  export type PrismaVersion = {
    client: string;
    engine: string;
  };

  export const prismaVersion: PrismaVersion;

  /**
   * Utility Types
   */

  export import Bytes = runtime.Bytes;
  export import JsonObject = runtime.JsonObject;
  export import JsonArray = runtime.JsonArray;
  export import JsonValue = runtime.JsonValue;
  export import InputJsonObject = runtime.InputJsonObject;
  export import InputJsonArray = runtime.InputJsonArray;
  export import InputJsonValue = runtime.InputJsonValue;

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
     * Type of `Prisma.DbNull`.
     *
     * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
     *
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
     */
    class DbNull {
      private DbNull: never;
      private constructor();
    }

    /**
     * Type of `Prisma.JsonNull`.
     *
     * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
     *
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
     */
    class JsonNull {
      private JsonNull: never;
      private constructor();
    }

    /**
     * Type of `Prisma.AnyNull`.
     *
     * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
     *
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
     */
    class AnyNull {
      private AnyNull: never;
      private constructor();
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull;

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull;

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull;

  type SelectAndInclude = {
    select: any;
    include: any;
  };

  type SelectAndOmit = {
    select: any;
    omit: any;
  };

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> =
    T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<
    T extends (...args: any) => $Utils.JsPromise<any>,
  > = PromiseType<ReturnType<T>>;

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
    [P in K]: T[P];
  };

  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K;
  }[keyof T];

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K;
  };

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>;

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  } & (T extends SelectAndInclude
    ? 'Please either choose `select` or `include`.'
    : T extends SelectAndOmit
      ? 'Please either choose `select` or `omit`.'
      : {});

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  } & K;

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> = T extends object
    ? U extends object
      ? (Without<T, U> & U) | (Without<U, T> & T)
      : U
    : T;

  /**
   * Is T a Record?
   */
  type IsObject<T extends any> =
    T extends Array<any>
      ? False
      : T extends Date
        ? False
        : T extends Uint8Array
          ? False
          : T extends bigint
            ? False
            : T extends object
              ? True
              : False;

  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T;

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O>; // With K possibilities
    }[K];

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>;

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<
    __Either<O, K>
  >;

  type _Either<O extends object, K extends Key, strict extends Boolean> = {
    1: EitherStrict<O, K>;
    0: EitherLoose<O, K>;
  }[strict];

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1,
  > = O extends unknown ? _Either<O, K, strict> : never;

  export type Union = any;

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K];
  } & {};

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never;

  export type Overwrite<O extends object, O1 extends object> = {
    [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<
    Overwrite<
      U,
      {
        [K in keyof U]-?: At<U, K>;
      }
    >
  >;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O
    ? O[K]
    : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown
    ? AtStrict<O, K>
    : never;
  export type At<
    O extends object,
    K extends Key,
    strict extends Boolean = 1,
  > = {
    1: AtStrict<O, K>;
    0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function
    ? A
    : {
        [K in keyof A]: A[K];
      } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
      ?
          | (K extends keyof O ? { [P in K]: O[P] } & O : O)
          | ({ [P in keyof O as P extends K ? P : never]-?: O[P] } & O)
      : never
  >;

  type _Strict<U, _U = U> = U extends unknown
    ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>>
    : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False;

  // /**
  // 1
  // */
  export type True = 1;

  /**
  0
  */
  export type False = 0;

  export type Not<B extends Boolean> = {
    0: 1;
    1: 0;
  }[B];

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
      ? 1
      : 0;

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >;

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0;
      1: 1;
    };
    1: {
      0: 1;
      1: 1;
    };
  }[B1][B2];

  export type Keys<U extends Union> = U extends unknown ? keyof U : never;

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;

  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object
    ? {
        [P in keyof T]: P extends keyof O ? O[P] : never;
      }
    : never;

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>,
  > = IsObject<T> extends True ? U : T;

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<
            UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never
          >
        : never
      : {} extends FieldPaths<T[K]>
        ? never
        : K;
  }[keyof T];

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never;
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>;
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T;

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<
    T,
    K extends Enumerable<keyof T> | keyof T,
  > = Prisma__Pick<T, MaybeTupleToUnion<K>>;

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}`
    ? never
    : T;

  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>;

  type FieldRefInputType<Model, FieldType> = Model extends never
    ? never
    : FieldRef<Model, FieldType>;

  export const ModelName: {
    Bus: 'Bus';
    Trip: 'Trip';
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName];

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<
    { extArgs: $Extensions.InternalArgs },
    $Utils.Record<string, any>
  > {
    returns: Prisma.TypeMap<
      this['params']['extArgs'],
      ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}
    >;
  }

  export type TypeMap<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
    GlobalOmitOptions = {},
  > = {
    globalOmitOptions: {
      omit: GlobalOmitOptions;
    };
    meta: {
      modelProps: 'bus' | 'trip';
      txIsolationLevel: Prisma.TransactionIsolationLevel;
    };
    model: {
      Bus: {
        payload: Prisma.$BusPayload<ExtArgs>;
        fields: Prisma.BusFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.BusFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.BusFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>;
          };
          findFirst: {
            args: Prisma.BusFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.BusFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>;
          };
          findMany: {
            args: Prisma.BusFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>[];
          };
          create: {
            args: Prisma.BusCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>;
          };
          createMany: {
            args: Prisma.BusCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.BusCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>[];
          };
          delete: {
            args: Prisma.BusDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>;
          };
          update: {
            args: Prisma.BusUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>;
          };
          deleteMany: {
            args: Prisma.BusDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.BusUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateManyAndReturn: {
            args: Prisma.BusUpdateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>[];
          };
          upsert: {
            args: Prisma.BusUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$BusPayload>;
          };
          aggregate: {
            args: Prisma.BusAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateBus>;
          };
          groupBy: {
            args: Prisma.BusGroupByArgs<ExtArgs>;
            result: $Utils.Optional<BusGroupByOutputType>[];
          };
          count: {
            args: Prisma.BusCountArgs<ExtArgs>;
            result: $Utils.Optional<BusCountAggregateOutputType> | number;
          };
        };
      };
      Trip: {
        payload: Prisma.$TripPayload<ExtArgs>;
        fields: Prisma.TripFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.TripFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.TripFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>;
          };
          findFirst: {
            args: Prisma.TripFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.TripFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>;
          };
          findMany: {
            args: Prisma.TripFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>[];
          };
          create: {
            args: Prisma.TripCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>;
          };
          createMany: {
            args: Prisma.TripCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.TripCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>[];
          };
          delete: {
            args: Prisma.TripDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>;
          };
          update: {
            args: Prisma.TripUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>;
          };
          deleteMany: {
            args: Prisma.TripDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.TripUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateManyAndReturn: {
            args: Prisma.TripUpdateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>[];
          };
          upsert: {
            args: Prisma.TripUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TripPayload>;
          };
          aggregate: {
            args: Prisma.TripAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateTrip>;
          };
          groupBy: {
            args: Prisma.TripGroupByArgs<ExtArgs>;
            result: $Utils.Optional<TripGroupByOutputType>[];
          };
          count: {
            args: Prisma.TripCountArgs<ExtArgs>;
            result: $Utils.Optional<TripCountAggregateOutputType> | number;
          };
        };
      };
    };
  } & {
    other: {
      payload: any;
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]];
          result: any;
        };
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]];
          result: any;
        };
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]];
          result: any;
        };
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]];
          result: any;
        };
      };
    };
  };
  export const defineExtension: $Extensions.ExtendsHook<
    'define',
    Prisma.TypeMapCb,
    $Extensions.DefaultArgs
  >;
  export type DefaultPrismaClient = PrismaClient;
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal';
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat;
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     *
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     *
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     *
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[];
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    };
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory;
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string;
    /**
     * Global configuration for omitting model fields by default.
     *
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig;
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     *
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[];
  }
  export type GlobalOmitConfig = {
    bus?: BusOmit;
    trip?: TripOmit;
  };

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error';
  export type LogDefinition = {
    level: LogLevel;
    emit: 'stdout' | 'event';
  };

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> =
    T extends Array<LogLevel | LogDefinition> ? GetLogType<T[number]> : never;

  export type QueryEvent = {
    timestamp: Date;
    query: string;
    params: string;
    duration: number;
    target: string;
  };

  export type LogEvent = {
    timestamp: Date;
    message: string;
    target: string;
  };
  /* End Types for Logging */

  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy';

  // tested in getLogLevel.test.ts
  export function getLogLevel(
    log: Array<LogLevel | LogDefinition>,
  ): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<
    Prisma.DefaultPrismaClient,
    runtime.ITXClientDenyList
  >;

  export type Datasource = {
    url?: string;
  };

  /**
   * Count Types
   */

  /**
   * Count Type BusCountOutputType
   */

  export type BusCountOutputType = {
    trips: number;
  };

  export type BusCountOutputTypeSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    trips?: boolean | BusCountOutputTypeCountTripsArgs;
  };

  // Custom InputTypes
  /**
   * BusCountOutputType without action
   */
  export type BusCountOutputTypeDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the BusCountOutputType
     */
    select?: BusCountOutputTypeSelect<ExtArgs> | null;
  };

  /**
   * BusCountOutputType without action
   */
  export type BusCountOutputTypeCountTripsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: TripWhereInput;
  };

  /**
   * Models
   */

  /**
   * Model Bus
   */

  export type AggregateBus = {
    _count: BusCountAggregateOutputType | null;
    _avg: BusAvgAggregateOutputType | null;
    _sum: BusSumAggregateOutputType | null;
    _min: BusMinAggregateOutputType | null;
    _max: BusMaxAggregateOutputType | null;
  };

  export type BusAvgAggregateOutputType = {
    chairs: number | null;
    left: number | null;
    right: number | null;
  };

  export type BusSumAggregateOutputType = {
    chairs: number | null;
    left: number | null;
    right: number | null;
  };

  export type BusMinAggregateOutputType = {
    id: string | null;
    name: string | null;
    chairs: number | null;
    left: number | null;
    right: number | null;
    seatStartFrom: $Enums.SeatStartFrom | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type BusMaxAggregateOutputType = {
    id: string | null;
    name: string | null;
    chairs: number | null;
    left: number | null;
    right: number | null;
    seatStartFrom: $Enums.SeatStartFrom | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type BusCountAggregateOutputType = {
    id: number;
    name: number;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: number;
    plate: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type BusAvgAggregateInputType = {
    chairs?: true;
    left?: true;
    right?: true;
  };

  export type BusSumAggregateInputType = {
    chairs?: true;
    left?: true;
    right?: true;
  };

  export type BusMinAggregateInputType = {
    id?: true;
    name?: true;
    chairs?: true;
    left?: true;
    right?: true;
    seatStartFrom?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type BusMaxAggregateInputType = {
    id?: true;
    name?: true;
    chairs?: true;
    left?: true;
    right?: true;
    seatStartFrom?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type BusCountAggregateInputType = {
    id?: true;
    name?: true;
    chairs?: true;
    left?: true;
    right?: true;
    seatStartFrom?: true;
    plate?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type BusAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Bus to aggregate.
     */
    where?: BusWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Buses to fetch.
     */
    orderBy?: BusOrderByWithRelationInput | BusOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: BusWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Buses from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Buses.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Buses
     **/
    _count?: true | BusCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
     **/
    _avg?: BusAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
     **/
    _sum?: BusSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: BusMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: BusMaxAggregateInputType;
  };

  export type GetBusAggregateType<T extends BusAggregateArgs> = {
    [P in keyof T & keyof AggregateBus]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBus[P]>
      : GetScalarType<T[P], AggregateBus[P]>;
  };

  export type BusGroupByArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: BusWhereInput;
    orderBy?: BusOrderByWithAggregationInput | BusOrderByWithAggregationInput[];
    by: BusScalarFieldEnum[] | BusScalarFieldEnum;
    having?: BusScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: BusCountAggregateInputType | true;
    _avg?: BusAvgAggregateInputType;
    _sum?: BusSumAggregateInputType;
    _min?: BusMinAggregateInputType;
    _max?: BusMaxAggregateInputType;
  };

  export type BusGroupByOutputType = {
    id: string;
    name: string;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: $Enums.SeatStartFrom;
    plate: JsonValue;
    createdAt: Date;
    updatedAt: Date;
    _count: BusCountAggregateOutputType | null;
    _avg: BusAvgAggregateOutputType | null;
    _sum: BusSumAggregateOutputType | null;
    _min: BusMinAggregateOutputType | null;
    _max: BusMaxAggregateOutputType | null;
  };

  type GetBusGroupByPayload<T extends BusGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BusGroupByOutputType, T['by']> & {
        [P in keyof T & keyof BusGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], BusGroupByOutputType[P]>
          : GetScalarType<T[P], BusGroupByOutputType[P]>;
      }
    >
  >;

  export type BusSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      name?: boolean;
      chairs?: boolean;
      left?: boolean;
      right?: boolean;
      seatStartFrom?: boolean;
      plate?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      trips?: boolean | Bus$tripsArgs<ExtArgs>;
      _count?: boolean | BusCountOutputTypeDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['bus']
  >;

  export type BusSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      name?: boolean;
      chairs?: boolean;
      left?: boolean;
      right?: boolean;
      seatStartFrom?: boolean;
      plate?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
    },
    ExtArgs['result']['bus']
  >;

  export type BusSelectUpdateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      name?: boolean;
      chairs?: boolean;
      left?: boolean;
      right?: boolean;
      seatStartFrom?: boolean;
      plate?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
    },
    ExtArgs['result']['bus']
  >;

  export type BusSelectScalar = {
    id?: boolean;
    name?: boolean;
    chairs?: boolean;
    left?: boolean;
    right?: boolean;
    seatStartFrom?: boolean;
    plate?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type BusOmit<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetOmit<
    | 'id'
    | 'name'
    | 'chairs'
    | 'left'
    | 'right'
    | 'seatStartFrom'
    | 'plate'
    | 'createdAt'
    | 'updatedAt',
    ExtArgs['result']['bus']
  >;
  export type BusInclude<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    trips?: boolean | Bus$tripsArgs<ExtArgs>;
    _count?: boolean | BusCountOutputTypeDefaultArgs<ExtArgs>;
  };
  export type BusIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {};
  export type BusIncludeUpdateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {};

  export type $BusPayload<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    name: 'Bus';
    objects: {
      trips: Prisma.$TripPayload<ExtArgs>[];
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        name: string;
        chairs: number;
        /**
         * Seat layout configuration
         *
         *     Example:
         *     leftSideSeatsPerRow = 2
         *     rightSideSeatsPerRow = 2
         *
         *     Means:
         *     [L L] aisle [R R]
         *
         *     seatStartFrom:
         *     - LEFT  -> numbering starts from left side
         *     - RIGHT -> numbering starts from right side
         */
        left: number;
        right: number;
        seatStartFrom: $Enums.SeatStartFrom;
        /**
         * Plate stored as JSON to support Sudan format
         *
         *     Example JSON:
         *     {
         *       "arabic": "س ع 1234",
         *       "english": "SA 1234",
         *       "numbers": "1234",
         *       "layout": "horizontal" // or "vertical"
         *     }
         */
        plate: Prisma.JsonValue;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['bus']
    >;
    composites: {};
  };

  type BusGetPayload<S extends boolean | null | undefined | BusDefaultArgs> =
    $Result.GetResult<Prisma.$BusPayload, S>;

  type BusCountArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = Omit<BusFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: BusCountAggregateInputType | true;
  };

  export interface BusDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
    GlobalOmitOptions = {},
  > {
    [K: symbol]: {
      types: Prisma.TypeMap<ExtArgs>['model']['Bus'];
      meta: { name: 'Bus' };
    };
    /**
     * Find zero or one Bus that matches the filter.
     * @param {BusFindUniqueArgs} args - Arguments to find a Bus
     * @example
     * // Get one Bus
     * const bus = await prisma.bus.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BusFindUniqueArgs>(
      args: SelectSubset<T, BusFindUniqueArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'findUnique',
        GlobalOmitOptions
      > | null,
      null,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find one Bus that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BusFindUniqueOrThrowArgs} args - Arguments to find a Bus
     * @example
     * // Get one Bus
     * const bus = await prisma.bus.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BusFindUniqueOrThrowArgs>(
      args: SelectSubset<T, BusFindUniqueOrThrowArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'findUniqueOrThrow',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find the first Bus that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusFindFirstArgs} args - Arguments to find a Bus
     * @example
     * // Get one Bus
     * const bus = await prisma.bus.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BusFindFirstArgs>(
      args?: SelectSubset<T, BusFindFirstArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'findFirst',
        GlobalOmitOptions
      > | null,
      null,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find the first Bus that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusFindFirstOrThrowArgs} args - Arguments to find a Bus
     * @example
     * // Get one Bus
     * const bus = await prisma.bus.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BusFindFirstOrThrowArgs>(
      args?: SelectSubset<T, BusFindFirstOrThrowArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'findFirstOrThrow',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find zero or more Buses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Buses
     * const buses = await prisma.bus.findMany()
     *
     * // Get first 10 Buses
     * const buses = await prisma.bus.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const busWithIdOnly = await prisma.bus.findMany({ select: { id: true } })
     *
     */
    findMany<T extends BusFindManyArgs>(
      args?: SelectSubset<T, BusFindManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'findMany',
        GlobalOmitOptions
      >
    >;

    /**
     * Create a Bus.
     * @param {BusCreateArgs} args - Arguments to create a Bus.
     * @example
     * // Create one Bus
     * const Bus = await prisma.bus.create({
     *   data: {
     *     // ... data to create a Bus
     *   }
     * })
     *
     */
    create<T extends BusCreateArgs>(
      args: SelectSubset<T, BusCreateArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'create',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Create many Buses.
     * @param {BusCreateManyArgs} args - Arguments to create many Buses.
     * @example
     * // Create many Buses
     * const bus = await prisma.bus.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends BusCreateManyArgs>(
      args?: SelectSubset<T, BusCreateManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Buses and returns the data saved in the database.
     * @param {BusCreateManyAndReturnArgs} args - Arguments to create many Buses.
     * @example
     * // Create many Buses
     * const bus = await prisma.bus.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Buses and only return the `id`
     * const busWithIdOnly = await prisma.bus.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends BusCreateManyAndReturnArgs>(
      args?: SelectSubset<T, BusCreateManyAndReturnArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'createManyAndReturn',
        GlobalOmitOptions
      >
    >;

    /**
     * Delete a Bus.
     * @param {BusDeleteArgs} args - Arguments to delete one Bus.
     * @example
     * // Delete one Bus
     * const Bus = await prisma.bus.delete({
     *   where: {
     *     // ... filter to delete one Bus
     *   }
     * })
     *
     */
    delete<T extends BusDeleteArgs>(
      args: SelectSubset<T, BusDeleteArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'delete',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Update one Bus.
     * @param {BusUpdateArgs} args - Arguments to update one Bus.
     * @example
     * // Update one Bus
     * const bus = await prisma.bus.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends BusUpdateArgs>(
      args: SelectSubset<T, BusUpdateArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'update',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Delete zero or more Buses.
     * @param {BusDeleteManyArgs} args - Arguments to filter Buses to delete.
     * @example
     * // Delete a few Buses
     * const { count } = await prisma.bus.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends BusDeleteManyArgs>(
      args?: SelectSubset<T, BusDeleteManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Buses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Buses
     * const bus = await prisma.bus.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends BusUpdateManyArgs>(
      args: SelectSubset<T, BusUpdateManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Buses and returns the data updated in the database.
     * @param {BusUpdateManyAndReturnArgs} args - Arguments to update many Buses.
     * @example
     * // Update many Buses
     * const bus = await prisma.bus.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more Buses and only return the `id`
     * const busWithIdOnly = await prisma.bus.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends BusUpdateManyAndReturnArgs>(
      args: SelectSubset<T, BusUpdateManyAndReturnArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'updateManyAndReturn',
        GlobalOmitOptions
      >
    >;

    /**
     * Create or update one Bus.
     * @param {BusUpsertArgs} args - Arguments to update or create a Bus.
     * @example
     * // Update or create a Bus
     * const bus = await prisma.bus.upsert({
     *   create: {
     *     // ... data to create a Bus
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Bus we want to update
     *   }
     * })
     */
    upsert<T extends BusUpsertArgs>(
      args: SelectSubset<T, BusUpsertArgs<ExtArgs>>,
    ): Prisma__BusClient<
      $Result.GetResult<
        Prisma.$BusPayload<ExtArgs>,
        T,
        'upsert',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Count the number of Buses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusCountArgs} args - Arguments to filter Buses to count.
     * @example
     * // Count the number of Buses
     * const count = await prisma.bus.count({
     *   where: {
     *     // ... the filter for the Buses we want to count
     *   }
     * })
     **/
    count<T extends BusCountArgs>(
      args?: Subset<T, BusCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BusCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a Bus.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends BusAggregateArgs>(
      args: Subset<T, BusAggregateArgs>,
    ): Prisma.PrismaPromise<GetBusAggregateType<T>>;

    /**
     * Group by Bus.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends BusGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BusGroupByArgs['orderBy'] }
        : { orderBy?: BusGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<
        Keys<MaybeTupleToUnion<T['orderBy']>>
      >,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [
                      Error,
                      'Field ',
                      P,
                      ` in "having" needs to be provided in "by"`,
                    ];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, BusGroupByArgs, OrderByArg> & InputErrors,
    ): {} extends InputErrors
      ? GetBusGroupByPayload<T>
      : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Bus model
     */
    readonly fields: BusFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Bus.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BusClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
    GlobalOmitOptions = {},
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    trips<T extends Bus$tripsArgs<ExtArgs> = {}>(
      args?: Subset<T, Bus$tripsArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      | $Result.GetResult<
          Prisma.$TripPayload<ExtArgs>,
          T,
          'findMany',
          GlobalOmitOptions
        >
      | Null
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the Bus model
   */
  interface BusFieldRefs {
    readonly id: FieldRef<'Bus', 'String'>;
    readonly name: FieldRef<'Bus', 'String'>;
    readonly chairs: FieldRef<'Bus', 'Int'>;
    readonly left: FieldRef<'Bus', 'Int'>;
    readonly right: FieldRef<'Bus', 'Int'>;
    readonly seatStartFrom: FieldRef<'Bus', 'SeatStartFrom'>;
    readonly plate: FieldRef<'Bus', 'Json'>;
    readonly createdAt: FieldRef<'Bus', 'DateTime'>;
    readonly updatedAt: FieldRef<'Bus', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * Bus findUnique
   */
  export type BusFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * Filter, which Bus to fetch.
     */
    where: BusWhereUniqueInput;
  };

  /**
   * Bus findUniqueOrThrow
   */
  export type BusFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * Filter, which Bus to fetch.
     */
    where: BusWhereUniqueInput;
  };

  /**
   * Bus findFirst
   */
  export type BusFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * Filter, which Bus to fetch.
     */
    where?: BusWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Buses to fetch.
     */
    orderBy?: BusOrderByWithRelationInput | BusOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Buses.
     */
    cursor?: BusWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Buses from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Buses.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Buses.
     */
    distinct?: BusScalarFieldEnum | BusScalarFieldEnum[];
  };

  /**
   * Bus findFirstOrThrow
   */
  export type BusFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * Filter, which Bus to fetch.
     */
    where?: BusWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Buses to fetch.
     */
    orderBy?: BusOrderByWithRelationInput | BusOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Buses.
     */
    cursor?: BusWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Buses from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Buses.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Buses.
     */
    distinct?: BusScalarFieldEnum | BusScalarFieldEnum[];
  };

  /**
   * Bus findMany
   */
  export type BusFindManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * Filter, which Buses to fetch.
     */
    where?: BusWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Buses to fetch.
     */
    orderBy?: BusOrderByWithRelationInput | BusOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Buses.
     */
    cursor?: BusWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Buses from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Buses.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Buses.
     */
    distinct?: BusScalarFieldEnum | BusScalarFieldEnum[];
  };

  /**
   * Bus create
   */
  export type BusCreateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * The data needed to create a Bus.
     */
    data: XOR<BusCreateInput, BusUncheckedCreateInput>;
  };

  /**
   * Bus createMany
   */
  export type BusCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Buses.
     */
    data: BusCreateManyInput | BusCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Bus createManyAndReturn
   */
  export type BusCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * The data used to create many Buses.
     */
    data: BusCreateManyInput | BusCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Bus update
   */
  export type BusUpdateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * The data needed to update a Bus.
     */
    data: XOR<BusUpdateInput, BusUncheckedUpdateInput>;
    /**
     * Choose, which Bus to update.
     */
    where: BusWhereUniqueInput;
  };

  /**
   * Bus updateMany
   */
  export type BusUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Buses.
     */
    data: XOR<BusUpdateManyMutationInput, BusUncheckedUpdateManyInput>;
    /**
     * Filter which Buses to update
     */
    where?: BusWhereInput;
    /**
     * Limit how many Buses to update.
     */
    limit?: number;
  };

  /**
   * Bus updateManyAndReturn
   */
  export type BusUpdateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * The data used to update Buses.
     */
    data: XOR<BusUpdateManyMutationInput, BusUncheckedUpdateManyInput>;
    /**
     * Filter which Buses to update
     */
    where?: BusWhereInput;
    /**
     * Limit how many Buses to update.
     */
    limit?: number;
  };

  /**
   * Bus upsert
   */
  export type BusUpsertArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * The filter to search for the Bus to update in case it exists.
     */
    where: BusWhereUniqueInput;
    /**
     * In case the Bus found by the `where` argument doesn't exist, create a new Bus with this data.
     */
    create: XOR<BusCreateInput, BusUncheckedCreateInput>;
    /**
     * In case the Bus was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BusUpdateInput, BusUncheckedUpdateInput>;
  };

  /**
   * Bus delete
   */
  export type BusDeleteArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
    /**
     * Filter which Bus to delete.
     */
    where: BusWhereUniqueInput;
  };

  /**
   * Bus deleteMany
   */
  export type BusDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Buses to delete
     */
    where?: BusWhereInput;
    /**
     * Limit how many Buses to delete.
     */
    limit?: number;
  };

  /**
   * Bus.trips
   */
  export type Bus$tripsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    where?: TripWhereInput;
    orderBy?: TripOrderByWithRelationInput | TripOrderByWithRelationInput[];
    cursor?: TripWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: TripScalarFieldEnum | TripScalarFieldEnum[];
  };

  /**
   * Bus without action
   */
  export type BusDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Bus
     */
    select?: BusSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Bus
     */
    omit?: BusOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BusInclude<ExtArgs> | null;
  };

  /**
   * Model Trip
   */

  export type AggregateTrip = {
    _count: TripCountAggregateOutputType | null;
    _min: TripMinAggregateOutputType | null;
    _max: TripMaxAggregateOutputType | null;
  };

  export type TripMinAggregateOutputType = {
    id: string | null;
    busId: string | null;
    presence_time: Date | null;
    departureDate: Date | null;
    departureTime: Date | null;
    fromState: string | null;
    fromCity: string | null;
    fromStation: string | null;
    arrivalTime: Date | null;
    arrivalDate: Date | null;
    toState: string | null;
    toCity: string | null;
    toStation: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type TripMaxAggregateOutputType = {
    id: string | null;
    busId: string | null;
    presence_time: Date | null;
    departureDate: Date | null;
    departureTime: Date | null;
    fromState: string | null;
    fromCity: string | null;
    fromStation: string | null;
    arrivalTime: Date | null;
    arrivalDate: Date | null;
    toState: string | null;
    toCity: string | null;
    toStation: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type TripCountAggregateOutputType = {
    id: number;
    busId: number;
    presence_time: number;
    departureDate: number;
    departureTime: number;
    fromState: number;
    fromCity: number;
    fromStation: number;
    arrivalTime: number;
    arrivalDate: number;
    toState: number;
    toCity: number;
    toStation: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type TripMinAggregateInputType = {
    id?: true;
    busId?: true;
    presence_time?: true;
    departureDate?: true;
    departureTime?: true;
    fromState?: true;
    fromCity?: true;
    fromStation?: true;
    arrivalTime?: true;
    arrivalDate?: true;
    toState?: true;
    toCity?: true;
    toStation?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type TripMaxAggregateInputType = {
    id?: true;
    busId?: true;
    presence_time?: true;
    departureDate?: true;
    departureTime?: true;
    fromState?: true;
    fromCity?: true;
    fromStation?: true;
    arrivalTime?: true;
    arrivalDate?: true;
    toState?: true;
    toCity?: true;
    toStation?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type TripCountAggregateInputType = {
    id?: true;
    busId?: true;
    presence_time?: true;
    departureDate?: true;
    departureTime?: true;
    fromState?: true;
    fromCity?: true;
    fromStation?: true;
    arrivalTime?: true;
    arrivalDate?: true;
    toState?: true;
    toCity?: true;
    toStation?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type TripAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Trip to aggregate.
     */
    where?: TripWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Trips to fetch.
     */
    orderBy?: TripOrderByWithRelationInput | TripOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: TripWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Trips from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Trips.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Trips
     **/
    _count?: true | TripCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: TripMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: TripMaxAggregateInputType;
  };

  export type GetTripAggregateType<T extends TripAggregateArgs> = {
    [P in keyof T & keyof AggregateTrip]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTrip[P]>
      : GetScalarType<T[P], AggregateTrip[P]>;
  };

  export type TripGroupByArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: TripWhereInput;
    orderBy?:
      | TripOrderByWithAggregationInput
      | TripOrderByWithAggregationInput[];
    by: TripScalarFieldEnum[] | TripScalarFieldEnum;
    having?: TripScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: TripCountAggregateInputType | true;
    _min?: TripMinAggregateInputType;
    _max?: TripMaxAggregateInputType;
  };

  export type TripGroupByOutputType = {
    id: string;
    busId: string;
    presence_time: Date;
    departureDate: Date;
    departureTime: Date;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date;
    arrivalDate: Date;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt: Date;
    updatedAt: Date;
    _count: TripCountAggregateOutputType | null;
    _min: TripMinAggregateOutputType | null;
    _max: TripMaxAggregateOutputType | null;
  };

  type GetTripGroupByPayload<T extends TripGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TripGroupByOutputType, T['by']> & {
        [P in keyof T & keyof TripGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], TripGroupByOutputType[P]>
          : GetScalarType<T[P], TripGroupByOutputType[P]>;
      }
    >
  >;

  export type TripSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      busId?: boolean;
      presence_time?: boolean;
      departureDate?: boolean;
      departureTime?: boolean;
      fromState?: boolean;
      fromCity?: boolean;
      fromStation?: boolean;
      arrivalTime?: boolean;
      arrivalDate?: boolean;
      toState?: boolean;
      toCity?: boolean;
      toStation?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      bus?: boolean | BusDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['trip']
  >;

  export type TripSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      busId?: boolean;
      presence_time?: boolean;
      departureDate?: boolean;
      departureTime?: boolean;
      fromState?: boolean;
      fromCity?: boolean;
      fromStation?: boolean;
      arrivalTime?: boolean;
      arrivalDate?: boolean;
      toState?: boolean;
      toCity?: boolean;
      toStation?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      bus?: boolean | BusDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['trip']
  >;

  export type TripSelectUpdateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      busId?: boolean;
      presence_time?: boolean;
      departureDate?: boolean;
      departureTime?: boolean;
      fromState?: boolean;
      fromCity?: boolean;
      fromStation?: boolean;
      arrivalTime?: boolean;
      arrivalDate?: boolean;
      toState?: boolean;
      toCity?: boolean;
      toStation?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      bus?: boolean | BusDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['trip']
  >;

  export type TripSelectScalar = {
    id?: boolean;
    busId?: boolean;
    presence_time?: boolean;
    departureDate?: boolean;
    departureTime?: boolean;
    fromState?: boolean;
    fromCity?: boolean;
    fromStation?: boolean;
    arrivalTime?: boolean;
    arrivalDate?: boolean;
    toState?: boolean;
    toCity?: boolean;
    toStation?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type TripOmit<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetOmit<
    | 'id'
    | 'busId'
    | 'presence_time'
    | 'departureDate'
    | 'departureTime'
    | 'fromState'
    | 'fromCity'
    | 'fromStation'
    | 'arrivalTime'
    | 'arrivalDate'
    | 'toState'
    | 'toCity'
    | 'toStation'
    | 'createdAt'
    | 'updatedAt',
    ExtArgs['result']['trip']
  >;
  export type TripInclude<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    bus?: boolean | BusDefaultArgs<ExtArgs>;
  };
  export type TripIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    bus?: boolean | BusDefaultArgs<ExtArgs>;
  };
  export type TripIncludeUpdateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    bus?: boolean | BusDefaultArgs<ExtArgs>;
  };

  export type $TripPayload<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    name: 'Trip';
    objects: {
      bus: Prisma.$BusPayload<ExtArgs>;
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        busId: string;
        presence_time: Date;
        departureDate: Date;
        departureTime: Date;
        fromState: string;
        fromCity: string;
        fromStation: string;
        arrivalTime: Date;
        arrivalDate: Date;
        toState: string;
        toCity: string;
        toStation: string;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['trip']
    >;
    composites: {};
  };

  type TripGetPayload<S extends boolean | null | undefined | TripDefaultArgs> =
    $Result.GetResult<Prisma.$TripPayload, S>;

  type TripCountArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = Omit<TripFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: TripCountAggregateInputType | true;
  };

  export interface TripDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
    GlobalOmitOptions = {},
  > {
    [K: symbol]: {
      types: Prisma.TypeMap<ExtArgs>['model']['Trip'];
      meta: { name: 'Trip' };
    };
    /**
     * Find zero or one Trip that matches the filter.
     * @param {TripFindUniqueArgs} args - Arguments to find a Trip
     * @example
     * // Get one Trip
     * const trip = await prisma.trip.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TripFindUniqueArgs>(
      args: SelectSubset<T, TripFindUniqueArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'findUnique',
        GlobalOmitOptions
      > | null,
      null,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find one Trip that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TripFindUniqueOrThrowArgs} args - Arguments to find a Trip
     * @example
     * // Get one Trip
     * const trip = await prisma.trip.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TripFindUniqueOrThrowArgs>(
      args: SelectSubset<T, TripFindUniqueOrThrowArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'findUniqueOrThrow',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find the first Trip that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripFindFirstArgs} args - Arguments to find a Trip
     * @example
     * // Get one Trip
     * const trip = await prisma.trip.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TripFindFirstArgs>(
      args?: SelectSubset<T, TripFindFirstArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'findFirst',
        GlobalOmitOptions
      > | null,
      null,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find the first Trip that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripFindFirstOrThrowArgs} args - Arguments to find a Trip
     * @example
     * // Get one Trip
     * const trip = await prisma.trip.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TripFindFirstOrThrowArgs>(
      args?: SelectSubset<T, TripFindFirstOrThrowArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'findFirstOrThrow',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Find zero or more Trips that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Trips
     * const trips = await prisma.trip.findMany()
     *
     * // Get first 10 Trips
     * const trips = await prisma.trip.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const tripWithIdOnly = await prisma.trip.findMany({ select: { id: true } })
     *
     */
    findMany<T extends TripFindManyArgs>(
      args?: SelectSubset<T, TripFindManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'findMany',
        GlobalOmitOptions
      >
    >;

    /**
     * Create a Trip.
     * @param {TripCreateArgs} args - Arguments to create a Trip.
     * @example
     * // Create one Trip
     * const Trip = await prisma.trip.create({
     *   data: {
     *     // ... data to create a Trip
     *   }
     * })
     *
     */
    create<T extends TripCreateArgs>(
      args: SelectSubset<T, TripCreateArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'create',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Create many Trips.
     * @param {TripCreateManyArgs} args - Arguments to create many Trips.
     * @example
     * // Create many Trips
     * const trip = await prisma.trip.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends TripCreateManyArgs>(
      args?: SelectSubset<T, TripCreateManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Trips and returns the data saved in the database.
     * @param {TripCreateManyAndReturnArgs} args - Arguments to create many Trips.
     * @example
     * // Create many Trips
     * const trip = await prisma.trip.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Trips and only return the `id`
     * const tripWithIdOnly = await prisma.trip.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends TripCreateManyAndReturnArgs>(
      args?: SelectSubset<T, TripCreateManyAndReturnArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'createManyAndReturn',
        GlobalOmitOptions
      >
    >;

    /**
     * Delete a Trip.
     * @param {TripDeleteArgs} args - Arguments to delete one Trip.
     * @example
     * // Delete one Trip
     * const Trip = await prisma.trip.delete({
     *   where: {
     *     // ... filter to delete one Trip
     *   }
     * })
     *
     */
    delete<T extends TripDeleteArgs>(
      args: SelectSubset<T, TripDeleteArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'delete',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Update one Trip.
     * @param {TripUpdateArgs} args - Arguments to update one Trip.
     * @example
     * // Update one Trip
     * const trip = await prisma.trip.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends TripUpdateArgs>(
      args: SelectSubset<T, TripUpdateArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'update',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Delete zero or more Trips.
     * @param {TripDeleteManyArgs} args - Arguments to filter Trips to delete.
     * @example
     * // Delete a few Trips
     * const { count } = await prisma.trip.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends TripDeleteManyArgs>(
      args?: SelectSubset<T, TripDeleteManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Trips.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Trips
     * const trip = await prisma.trip.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends TripUpdateManyArgs>(
      args: SelectSubset<T, TripUpdateManyArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Trips and returns the data updated in the database.
     * @param {TripUpdateManyAndReturnArgs} args - Arguments to update many Trips.
     * @example
     * // Update many Trips
     * const trip = await prisma.trip.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more Trips and only return the `id`
     * const tripWithIdOnly = await prisma.trip.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends TripUpdateManyAndReturnArgs>(
      args: SelectSubset<T, TripUpdateManyAndReturnArgs<ExtArgs>>,
    ): Prisma.PrismaPromise<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'updateManyAndReturn',
        GlobalOmitOptions
      >
    >;

    /**
     * Create or update one Trip.
     * @param {TripUpsertArgs} args - Arguments to update or create a Trip.
     * @example
     * // Update or create a Trip
     * const trip = await prisma.trip.upsert({
     *   create: {
     *     // ... data to create a Trip
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Trip we want to update
     *   }
     * })
     */
    upsert<T extends TripUpsertArgs>(
      args: SelectSubset<T, TripUpsertArgs<ExtArgs>>,
    ): Prisma__TripClient<
      $Result.GetResult<
        Prisma.$TripPayload<ExtArgs>,
        T,
        'upsert',
        GlobalOmitOptions
      >,
      never,
      ExtArgs,
      GlobalOmitOptions
    >;

    /**
     * Count the number of Trips.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripCountArgs} args - Arguments to filter Trips to count.
     * @example
     * // Count the number of Trips
     * const count = await prisma.trip.count({
     *   where: {
     *     // ... the filter for the Trips we want to count
     *   }
     * })
     **/
    count<T extends TripCountArgs>(
      args?: Subset<T, TripCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TripCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a Trip.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends TripAggregateArgs>(
      args: Subset<T, TripAggregateArgs>,
    ): Prisma.PrismaPromise<GetTripAggregateType<T>>;

    /**
     * Group by Trip.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends TripGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TripGroupByArgs['orderBy'] }
        : { orderBy?: TripGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<
        Keys<MaybeTupleToUnion<T['orderBy']>>
      >,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [
                      Error,
                      'Field ',
                      P,
                      ` in "having" needs to be provided in "by"`,
                    ];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, TripGroupByArgs, OrderByArg> & InputErrors,
    ): {} extends InputErrors
      ? GetTripGroupByPayload<T>
      : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Trip model
     */
    readonly fields: TripFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Trip.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TripClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
    GlobalOmitOptions = {},
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    bus<T extends BusDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, BusDefaultArgs<ExtArgs>>,
    ): Prisma__BusClient<
      | $Result.GetResult<
          Prisma.$BusPayload<ExtArgs>,
          T,
          'findUniqueOrThrow',
          GlobalOmitOptions
        >
      | Null,
      Null,
      ExtArgs,
      GlobalOmitOptions
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the Trip model
   */
  interface TripFieldRefs {
    readonly id: FieldRef<'Trip', 'String'>;
    readonly busId: FieldRef<'Trip', 'String'>;
    readonly presence_time: FieldRef<'Trip', 'DateTime'>;
    readonly departureDate: FieldRef<'Trip', 'DateTime'>;
    readonly departureTime: FieldRef<'Trip', 'DateTime'>;
    readonly fromState: FieldRef<'Trip', 'String'>;
    readonly fromCity: FieldRef<'Trip', 'String'>;
    readonly fromStation: FieldRef<'Trip', 'String'>;
    readonly arrivalTime: FieldRef<'Trip', 'DateTime'>;
    readonly arrivalDate: FieldRef<'Trip', 'DateTime'>;
    readonly toState: FieldRef<'Trip', 'String'>;
    readonly toCity: FieldRef<'Trip', 'String'>;
    readonly toStation: FieldRef<'Trip', 'String'>;
    readonly createdAt: FieldRef<'Trip', 'DateTime'>;
    readonly updatedAt: FieldRef<'Trip', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * Trip findUnique
   */
  export type TripFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * Filter, which Trip to fetch.
     */
    where: TripWhereUniqueInput;
  };

  /**
   * Trip findUniqueOrThrow
   */
  export type TripFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * Filter, which Trip to fetch.
     */
    where: TripWhereUniqueInput;
  };

  /**
   * Trip findFirst
   */
  export type TripFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * Filter, which Trip to fetch.
     */
    where?: TripWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Trips to fetch.
     */
    orderBy?: TripOrderByWithRelationInput | TripOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Trips.
     */
    cursor?: TripWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Trips from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Trips.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Trips.
     */
    distinct?: TripScalarFieldEnum | TripScalarFieldEnum[];
  };

  /**
   * Trip findFirstOrThrow
   */
  export type TripFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * Filter, which Trip to fetch.
     */
    where?: TripWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Trips to fetch.
     */
    orderBy?: TripOrderByWithRelationInput | TripOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Trips.
     */
    cursor?: TripWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Trips from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Trips.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Trips.
     */
    distinct?: TripScalarFieldEnum | TripScalarFieldEnum[];
  };

  /**
   * Trip findMany
   */
  export type TripFindManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * Filter, which Trips to fetch.
     */
    where?: TripWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Trips to fetch.
     */
    orderBy?: TripOrderByWithRelationInput | TripOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Trips.
     */
    cursor?: TripWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Trips from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Trips.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Trips.
     */
    distinct?: TripScalarFieldEnum | TripScalarFieldEnum[];
  };

  /**
   * Trip create
   */
  export type TripCreateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * The data needed to create a Trip.
     */
    data: XOR<TripCreateInput, TripUncheckedCreateInput>;
  };

  /**
   * Trip createMany
   */
  export type TripCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Trips.
     */
    data: TripCreateManyInput | TripCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Trip createManyAndReturn
   */
  export type TripCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * The data used to create many Trips.
     */
    data: TripCreateManyInput | TripCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * Trip update
   */
  export type TripUpdateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * The data needed to update a Trip.
     */
    data: XOR<TripUpdateInput, TripUncheckedUpdateInput>;
    /**
     * Choose, which Trip to update.
     */
    where: TripWhereUniqueInput;
  };

  /**
   * Trip updateMany
   */
  export type TripUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Trips.
     */
    data: XOR<TripUpdateManyMutationInput, TripUncheckedUpdateManyInput>;
    /**
     * Filter which Trips to update
     */
    where?: TripWhereInput;
    /**
     * Limit how many Trips to update.
     */
    limit?: number;
  };

  /**
   * Trip updateManyAndReturn
   */
  export type TripUpdateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * The data used to update Trips.
     */
    data: XOR<TripUpdateManyMutationInput, TripUncheckedUpdateManyInput>;
    /**
     * Filter which Trips to update
     */
    where?: TripWhereInput;
    /**
     * Limit how many Trips to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripIncludeUpdateManyAndReturn<ExtArgs> | null;
  };

  /**
   * Trip upsert
   */
  export type TripUpsertArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * The filter to search for the Trip to update in case it exists.
     */
    where: TripWhereUniqueInput;
    /**
     * In case the Trip found by the `where` argument doesn't exist, create a new Trip with this data.
     */
    create: XOR<TripCreateInput, TripUncheckedCreateInput>;
    /**
     * In case the Trip was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TripUpdateInput, TripUncheckedUpdateInput>;
  };

  /**
   * Trip delete
   */
  export type TripDeleteArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
    /**
     * Filter which Trip to delete.
     */
    where: TripWhereUniqueInput;
  };

  /**
   * Trip deleteMany
   */
  export type TripDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Trips to delete
     */
    where?: TripWhereInput;
    /**
     * Limit how many Trips to delete.
     */
    limit?: number;
  };

  /**
   * Trip without action
   */
  export type TripDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Trip
     */
    select?: TripSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the Trip
     */
    omit?: TripOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripInclude<ExtArgs> | null;
  };

  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted';
    ReadCommitted: 'ReadCommitted';
    RepeatableRead: 'RepeatableRead';
    Serializable: 'Serializable';
  };

  export type TransactionIsolationLevel =
    (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];

  export const BusScalarFieldEnum: {
    id: 'id';
    name: 'name';
    chairs: 'chairs';
    left: 'left';
    right: 'right';
    seatStartFrom: 'seatStartFrom';
    plate: 'plate';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type BusScalarFieldEnum =
    (typeof BusScalarFieldEnum)[keyof typeof BusScalarFieldEnum];

  export const TripScalarFieldEnum: {
    id: 'id';
    busId: 'busId';
    presence_time: 'presence_time';
    departureDate: 'departureDate';
    departureTime: 'departureTime';
    fromState: 'fromState';
    fromCity: 'fromCity';
    fromStation: 'fromStation';
    arrivalTime: 'arrivalTime';
    arrivalDate: 'arrivalDate';
    toState: 'toState';
    toCity: 'toCity';
    toStation: 'toStation';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type TripScalarFieldEnum =
    (typeof TripScalarFieldEnum)[keyof typeof TripScalarFieldEnum];

  export const SortOrder: {
    asc: 'asc';
    desc: 'desc';
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull;
  };

  export type JsonNullValueInput =
    (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput];

  export const QueryMode: {
    default: 'default';
    insensitive: 'insensitive';
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];

  export const JsonNullValueFilter: {
    DbNull: typeof DbNull;
    JsonNull: typeof JsonNull;
    AnyNull: typeof AnyNull;
  };

  export type JsonNullValueFilter =
    (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];

  /**
   * Field references
   */

  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'String'
  >;

  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'String[]'
  >;

  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'Int'
  >;

  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'Int[]'
  >;

  /**
   * Reference to a field of type 'SeatStartFrom'
   */
  export type EnumSeatStartFromFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'SeatStartFrom'
  >;

  /**
   * Reference to a field of type 'SeatStartFrom[]'
   */
  export type ListEnumSeatStartFromFieldRefInput<$PrismaModel> =
    FieldRefInputType<$PrismaModel, 'SeatStartFrom[]'>;

  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'Json'
  >;

  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'QueryMode'
  >;

  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'DateTime'
  >;

  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'DateTime[]'
  >;

  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'Float'
  >;

  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'Float[]'
  >;

  /**
   * Deep Input Types
   */

  export type BusWhereInput = {
    AND?: BusWhereInput | BusWhereInput[];
    OR?: BusWhereInput[];
    NOT?: BusWhereInput | BusWhereInput[];
    id?: StringFilter<'Bus'> | string;
    name?: StringFilter<'Bus'> | string;
    chairs?: IntFilter<'Bus'> | number;
    left?: IntFilter<'Bus'> | number;
    right?: IntFilter<'Bus'> | number;
    seatStartFrom?: EnumSeatStartFromFilter<'Bus'> | $Enums.SeatStartFrom;
    plate?: JsonFilter<'Bus'>;
    createdAt?: DateTimeFilter<'Bus'> | Date | string;
    updatedAt?: DateTimeFilter<'Bus'> | Date | string;
    trips?: TripListRelationFilter;
  };

  export type BusOrderByWithRelationInput = {
    id?: SortOrder;
    name?: SortOrder;
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
    seatStartFrom?: SortOrder;
    plate?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    trips?: TripOrderByRelationAggregateInput;
  };

  export type BusWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      AND?: BusWhereInput | BusWhereInput[];
      OR?: BusWhereInput[];
      NOT?: BusWhereInput | BusWhereInput[];
      name?: StringFilter<'Bus'> | string;
      chairs?: IntFilter<'Bus'> | number;
      left?: IntFilter<'Bus'> | number;
      right?: IntFilter<'Bus'> | number;
      seatStartFrom?: EnumSeatStartFromFilter<'Bus'> | $Enums.SeatStartFrom;
      plate?: JsonFilter<'Bus'>;
      createdAt?: DateTimeFilter<'Bus'> | Date | string;
      updatedAt?: DateTimeFilter<'Bus'> | Date | string;
      trips?: TripListRelationFilter;
    },
    'id'
  >;

  export type BusOrderByWithAggregationInput = {
    id?: SortOrder;
    name?: SortOrder;
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
    seatStartFrom?: SortOrder;
    plate?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: BusCountOrderByAggregateInput;
    _avg?: BusAvgOrderByAggregateInput;
    _max?: BusMaxOrderByAggregateInput;
    _min?: BusMinOrderByAggregateInput;
    _sum?: BusSumOrderByAggregateInput;
  };

  export type BusScalarWhereWithAggregatesInput = {
    AND?:
      | BusScalarWhereWithAggregatesInput
      | BusScalarWhereWithAggregatesInput[];
    OR?: BusScalarWhereWithAggregatesInput[];
    NOT?:
      | BusScalarWhereWithAggregatesInput
      | BusScalarWhereWithAggregatesInput[];
    id?: StringWithAggregatesFilter<'Bus'> | string;
    name?: StringWithAggregatesFilter<'Bus'> | string;
    chairs?: IntWithAggregatesFilter<'Bus'> | number;
    left?: IntWithAggregatesFilter<'Bus'> | number;
    right?: IntWithAggregatesFilter<'Bus'> | number;
    seatStartFrom?:
      | EnumSeatStartFromWithAggregatesFilter<'Bus'>
      | $Enums.SeatStartFrom;
    plate?: JsonWithAggregatesFilter<'Bus'>;
    createdAt?: DateTimeWithAggregatesFilter<'Bus'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'Bus'> | Date | string;
  };

  export type TripWhereInput = {
    AND?: TripWhereInput | TripWhereInput[];
    OR?: TripWhereInput[];
    NOT?: TripWhereInput | TripWhereInput[];
    id?: StringFilter<'Trip'> | string;
    busId?: StringFilter<'Trip'> | string;
    presence_time?: DateTimeFilter<'Trip'> | Date | string;
    departureDate?: DateTimeFilter<'Trip'> | Date | string;
    departureTime?: DateTimeFilter<'Trip'> | Date | string;
    fromState?: StringFilter<'Trip'> | string;
    fromCity?: StringFilter<'Trip'> | string;
    fromStation?: StringFilter<'Trip'> | string;
    arrivalTime?: DateTimeFilter<'Trip'> | Date | string;
    arrivalDate?: DateTimeFilter<'Trip'> | Date | string;
    toState?: StringFilter<'Trip'> | string;
    toCity?: StringFilter<'Trip'> | string;
    toStation?: StringFilter<'Trip'> | string;
    createdAt?: DateTimeFilter<'Trip'> | Date | string;
    updatedAt?: DateTimeFilter<'Trip'> | Date | string;
    bus?: XOR<BusScalarRelationFilter, BusWhereInput>;
  };

  export type TripOrderByWithRelationInput = {
    id?: SortOrder;
    busId?: SortOrder;
    presence_time?: SortOrder;
    departureDate?: SortOrder;
    departureTime?: SortOrder;
    fromState?: SortOrder;
    fromCity?: SortOrder;
    fromStation?: SortOrder;
    arrivalTime?: SortOrder;
    arrivalDate?: SortOrder;
    toState?: SortOrder;
    toCity?: SortOrder;
    toStation?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    bus?: BusOrderByWithRelationInput;
  };

  export type TripWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      AND?: TripWhereInput | TripWhereInput[];
      OR?: TripWhereInput[];
      NOT?: TripWhereInput | TripWhereInput[];
      busId?: StringFilter<'Trip'> | string;
      presence_time?: DateTimeFilter<'Trip'> | Date | string;
      departureDate?: DateTimeFilter<'Trip'> | Date | string;
      departureTime?: DateTimeFilter<'Trip'> | Date | string;
      fromState?: StringFilter<'Trip'> | string;
      fromCity?: StringFilter<'Trip'> | string;
      fromStation?: StringFilter<'Trip'> | string;
      arrivalTime?: DateTimeFilter<'Trip'> | Date | string;
      arrivalDate?: DateTimeFilter<'Trip'> | Date | string;
      toState?: StringFilter<'Trip'> | string;
      toCity?: StringFilter<'Trip'> | string;
      toStation?: StringFilter<'Trip'> | string;
      createdAt?: DateTimeFilter<'Trip'> | Date | string;
      updatedAt?: DateTimeFilter<'Trip'> | Date | string;
      bus?: XOR<BusScalarRelationFilter, BusWhereInput>;
    },
    'id'
  >;

  export type TripOrderByWithAggregationInput = {
    id?: SortOrder;
    busId?: SortOrder;
    presence_time?: SortOrder;
    departureDate?: SortOrder;
    departureTime?: SortOrder;
    fromState?: SortOrder;
    fromCity?: SortOrder;
    fromStation?: SortOrder;
    arrivalTime?: SortOrder;
    arrivalDate?: SortOrder;
    toState?: SortOrder;
    toCity?: SortOrder;
    toStation?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: TripCountOrderByAggregateInput;
    _max?: TripMaxOrderByAggregateInput;
    _min?: TripMinOrderByAggregateInput;
  };

  export type TripScalarWhereWithAggregatesInput = {
    AND?:
      | TripScalarWhereWithAggregatesInput
      | TripScalarWhereWithAggregatesInput[];
    OR?: TripScalarWhereWithAggregatesInput[];
    NOT?:
      | TripScalarWhereWithAggregatesInput
      | TripScalarWhereWithAggregatesInput[];
    id?: StringWithAggregatesFilter<'Trip'> | string;
    busId?: StringWithAggregatesFilter<'Trip'> | string;
    presence_time?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
    departureDate?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
    departureTime?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
    fromState?: StringWithAggregatesFilter<'Trip'> | string;
    fromCity?: StringWithAggregatesFilter<'Trip'> | string;
    fromStation?: StringWithAggregatesFilter<'Trip'> | string;
    arrivalTime?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
    arrivalDate?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
    toState?: StringWithAggregatesFilter<'Trip'> | string;
    toCity?: StringWithAggregatesFilter<'Trip'> | string;
    toStation?: StringWithAggregatesFilter<'Trip'> | string;
    createdAt?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'Trip'> | Date | string;
  };

  export type BusCreateInput = {
    id?: string;
    name: string;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: $Enums.SeatStartFrom;
    plate: JsonNullValueInput | InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    trips?: TripCreateNestedManyWithoutBusInput;
  };

  export type BusUncheckedCreateInput = {
    id?: string;
    name: string;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: $Enums.SeatStartFrom;
    plate: JsonNullValueInput | InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    trips?: TripUncheckedCreateNestedManyWithoutBusInput;
  };

  export type BusUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    chairs?: IntFieldUpdateOperationsInput | number;
    left?: IntFieldUpdateOperationsInput | number;
    right?: IntFieldUpdateOperationsInput | number;
    seatStartFrom?:
      | EnumSeatStartFromFieldUpdateOperationsInput
      | $Enums.SeatStartFrom;
    plate?: JsonNullValueInput | InputJsonValue;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    trips?: TripUpdateManyWithoutBusNestedInput;
  };

  export type BusUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    chairs?: IntFieldUpdateOperationsInput | number;
    left?: IntFieldUpdateOperationsInput | number;
    right?: IntFieldUpdateOperationsInput | number;
    seatStartFrom?:
      | EnumSeatStartFromFieldUpdateOperationsInput
      | $Enums.SeatStartFrom;
    plate?: JsonNullValueInput | InputJsonValue;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    trips?: TripUncheckedUpdateManyWithoutBusNestedInput;
  };

  export type BusCreateManyInput = {
    id?: string;
    name: string;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: $Enums.SeatStartFrom;
    plate: JsonNullValueInput | InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type BusUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    chairs?: IntFieldUpdateOperationsInput | number;
    left?: IntFieldUpdateOperationsInput | number;
    right?: IntFieldUpdateOperationsInput | number;
    seatStartFrom?:
      | EnumSeatStartFromFieldUpdateOperationsInput
      | $Enums.SeatStartFrom;
    plate?: JsonNullValueInput | InputJsonValue;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type BusUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    chairs?: IntFieldUpdateOperationsInput | number;
    left?: IntFieldUpdateOperationsInput | number;
    right?: IntFieldUpdateOperationsInput | number;
    seatStartFrom?:
      | EnumSeatStartFromFieldUpdateOperationsInput
      | $Enums.SeatStartFrom;
    plate?: JsonNullValueInput | InputJsonValue;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TripCreateInput = {
    id?: string;
    presence_time: Date | string;
    departureDate: Date | string;
    departureTime: Date | string;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date | string;
    arrivalDate: Date | string;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    bus: BusCreateNestedOneWithoutTripsInput;
  };

  export type TripUncheckedCreateInput = {
    id?: string;
    busId: string;
    presence_time: Date | string;
    departureDate: Date | string;
    departureTime: Date | string;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date | string;
    arrivalDate: Date | string;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TripUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    bus?: BusUpdateOneRequiredWithoutTripsNestedInput;
  };

  export type TripUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    busId?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TripCreateManyInput = {
    id?: string;
    busId: string;
    presence_time: Date | string;
    departureDate: Date | string;
    departureTime: Date | string;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date | string;
    arrivalDate: Date | string;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TripUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TripUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    busId?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedStringFilter<$PrismaModel> | string;
  };

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntFilter<$PrismaModel> | number;
  };

  export type EnumSeatStartFromFilter<$PrismaModel = never> = {
    equals?:
      | $Enums.SeatStartFrom
      | EnumSeatStartFromFieldRefInput<$PrismaModel>;
    in?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    notIn?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    not?: NestedEnumSeatStartFromFilter<$PrismaModel> | $Enums.SeatStartFrom;
  };
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<
          Required<JsonFilterBase<$PrismaModel>>,
          Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>
        >,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>;

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?:
      | InputJsonValue
      | JsonFieldRefInput<$PrismaModel>
      | JsonNullValueFilter;
    path?: string[];
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>;
    string_contains?: string | StringFieldRefInput<$PrismaModel>;
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>;
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>;
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    not?:
      | InputJsonValue
      | JsonFieldRefInput<$PrismaModel>
      | JsonNullValueFilter;
  };

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string;
  };

  export type TripListRelationFilter = {
    every?: TripWhereInput;
    some?: TripWhereInput;
    none?: TripWhereInput;
  };

  export type TripOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type BusCountOrderByAggregateInput = {
    id?: SortOrder;
    name?: SortOrder;
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
    seatStartFrom?: SortOrder;
    plate?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type BusAvgOrderByAggregateInput = {
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
  };

  export type BusMaxOrderByAggregateInput = {
    id?: SortOrder;
    name?: SortOrder;
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
    seatStartFrom?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type BusMinOrderByAggregateInput = {
    id?: SortOrder;
    name?: SortOrder;
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
    seatStartFrom?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type BusSumOrderByAggregateInput = {
    chairs?: SortOrder;
    left?: SortOrder;
    right?: SortOrder;
  };

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedStringFilter<$PrismaModel>;
    _max?: NestedStringFilter<$PrismaModel>;
  };

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number;
    _count?: NestedIntFilter<$PrismaModel>;
    _avg?: NestedFloatFilter<$PrismaModel>;
    _sum?: NestedIntFilter<$PrismaModel>;
    _min?: NestedIntFilter<$PrismaModel>;
    _max?: NestedIntFilter<$PrismaModel>;
  };

  export type EnumSeatStartFromWithAggregatesFilter<$PrismaModel = never> = {
    equals?:
      | $Enums.SeatStartFrom
      | EnumSeatStartFromFieldRefInput<$PrismaModel>;
    in?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    notIn?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    not?:
      | NestedEnumSeatStartFromWithAggregatesFilter<$PrismaModel>
      | $Enums.SeatStartFrom;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumSeatStartFromFilter<$PrismaModel>;
    _max?: NestedEnumSeatStartFromFilter<$PrismaModel>;
  };
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<
          Required<JsonWithAggregatesFilterBase<$PrismaModel>>,
          Exclude<
            keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>,
            'path'
          >
        >,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<
        Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>
      >;

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?:
      | InputJsonValue
      | JsonFieldRefInput<$PrismaModel>
      | JsonNullValueFilter;
    path?: string[];
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>;
    string_contains?: string | StringFieldRefInput<$PrismaModel>;
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>;
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>;
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    not?:
      | InputJsonValue
      | JsonFieldRefInput<$PrismaModel>
      | JsonNullValueFilter;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedJsonFilter<$PrismaModel>;
    _max?: NestedJsonFilter<$PrismaModel>;
  };

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedDateTimeFilter<$PrismaModel>;
    _max?: NestedDateTimeFilter<$PrismaModel>;
  };

  export type BusScalarRelationFilter = {
    is?: BusWhereInput;
    isNot?: BusWhereInput;
  };

  export type TripCountOrderByAggregateInput = {
    id?: SortOrder;
    busId?: SortOrder;
    presence_time?: SortOrder;
    departureDate?: SortOrder;
    departureTime?: SortOrder;
    fromState?: SortOrder;
    fromCity?: SortOrder;
    fromStation?: SortOrder;
    arrivalTime?: SortOrder;
    arrivalDate?: SortOrder;
    toState?: SortOrder;
    toCity?: SortOrder;
    toStation?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TripMaxOrderByAggregateInput = {
    id?: SortOrder;
    busId?: SortOrder;
    presence_time?: SortOrder;
    departureDate?: SortOrder;
    departureTime?: SortOrder;
    fromState?: SortOrder;
    fromCity?: SortOrder;
    fromStation?: SortOrder;
    arrivalTime?: SortOrder;
    arrivalDate?: SortOrder;
    toState?: SortOrder;
    toCity?: SortOrder;
    toStation?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TripMinOrderByAggregateInput = {
    id?: SortOrder;
    busId?: SortOrder;
    presence_time?: SortOrder;
    departureDate?: SortOrder;
    departureTime?: SortOrder;
    fromState?: SortOrder;
    fromCity?: SortOrder;
    fromStation?: SortOrder;
    arrivalTime?: SortOrder;
    arrivalDate?: SortOrder;
    toState?: SortOrder;
    toCity?: SortOrder;
    toStation?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TripCreateNestedManyWithoutBusInput = {
    create?:
      | XOR<TripCreateWithoutBusInput, TripUncheckedCreateWithoutBusInput>
      | TripCreateWithoutBusInput[]
      | TripUncheckedCreateWithoutBusInput[];
    connectOrCreate?:
      | TripCreateOrConnectWithoutBusInput
      | TripCreateOrConnectWithoutBusInput[];
    createMany?: TripCreateManyBusInputEnvelope;
    connect?: TripWhereUniqueInput | TripWhereUniqueInput[];
  };

  export type TripUncheckedCreateNestedManyWithoutBusInput = {
    create?:
      | XOR<TripCreateWithoutBusInput, TripUncheckedCreateWithoutBusInput>
      | TripCreateWithoutBusInput[]
      | TripUncheckedCreateWithoutBusInput[];
    connectOrCreate?:
      | TripCreateOrConnectWithoutBusInput
      | TripCreateOrConnectWithoutBusInput[];
    createMany?: TripCreateManyBusInputEnvelope;
    connect?: TripWhereUniqueInput | TripWhereUniqueInput[];
  };

  export type StringFieldUpdateOperationsInput = {
    set?: string;
  };

  export type IntFieldUpdateOperationsInput = {
    set?: number;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
  };

  export type EnumSeatStartFromFieldUpdateOperationsInput = {
    set?: $Enums.SeatStartFrom;
  };

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string;
  };

  export type TripUpdateManyWithoutBusNestedInput = {
    create?:
      | XOR<TripCreateWithoutBusInput, TripUncheckedCreateWithoutBusInput>
      | TripCreateWithoutBusInput[]
      | TripUncheckedCreateWithoutBusInput[];
    connectOrCreate?:
      | TripCreateOrConnectWithoutBusInput
      | TripCreateOrConnectWithoutBusInput[];
    upsert?:
      | TripUpsertWithWhereUniqueWithoutBusInput
      | TripUpsertWithWhereUniqueWithoutBusInput[];
    createMany?: TripCreateManyBusInputEnvelope;
    set?: TripWhereUniqueInput | TripWhereUniqueInput[];
    disconnect?: TripWhereUniqueInput | TripWhereUniqueInput[];
    delete?: TripWhereUniqueInput | TripWhereUniqueInput[];
    connect?: TripWhereUniqueInput | TripWhereUniqueInput[];
    update?:
      | TripUpdateWithWhereUniqueWithoutBusInput
      | TripUpdateWithWhereUniqueWithoutBusInput[];
    updateMany?:
      | TripUpdateManyWithWhereWithoutBusInput
      | TripUpdateManyWithWhereWithoutBusInput[];
    deleteMany?: TripScalarWhereInput | TripScalarWhereInput[];
  };

  export type TripUncheckedUpdateManyWithoutBusNestedInput = {
    create?:
      | XOR<TripCreateWithoutBusInput, TripUncheckedCreateWithoutBusInput>
      | TripCreateWithoutBusInput[]
      | TripUncheckedCreateWithoutBusInput[];
    connectOrCreate?:
      | TripCreateOrConnectWithoutBusInput
      | TripCreateOrConnectWithoutBusInput[];
    upsert?:
      | TripUpsertWithWhereUniqueWithoutBusInput
      | TripUpsertWithWhereUniqueWithoutBusInput[];
    createMany?: TripCreateManyBusInputEnvelope;
    set?: TripWhereUniqueInput | TripWhereUniqueInput[];
    disconnect?: TripWhereUniqueInput | TripWhereUniqueInput[];
    delete?: TripWhereUniqueInput | TripWhereUniqueInput[];
    connect?: TripWhereUniqueInput | TripWhereUniqueInput[];
    update?:
      | TripUpdateWithWhereUniqueWithoutBusInput
      | TripUpdateWithWhereUniqueWithoutBusInput[];
    updateMany?:
      | TripUpdateManyWithWhereWithoutBusInput
      | TripUpdateManyWithWhereWithoutBusInput[];
    deleteMany?: TripScalarWhereInput | TripScalarWhereInput[];
  };

  export type BusCreateNestedOneWithoutTripsInput = {
    create?: XOR<
      BusCreateWithoutTripsInput,
      BusUncheckedCreateWithoutTripsInput
    >;
    connectOrCreate?: BusCreateOrConnectWithoutTripsInput;
    connect?: BusWhereUniqueInput;
  };

  export type BusUpdateOneRequiredWithoutTripsNestedInput = {
    create?: XOR<
      BusCreateWithoutTripsInput,
      BusUncheckedCreateWithoutTripsInput
    >;
    connectOrCreate?: BusCreateOrConnectWithoutTripsInput;
    upsert?: BusUpsertWithoutTripsInput;
    connect?: BusWhereUniqueInput;
    update?: XOR<
      XOR<BusUpdateToOneWithWhereWithoutTripsInput, BusUpdateWithoutTripsInput>,
      BusUncheckedUpdateWithoutTripsInput
    >;
  };

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedStringFilter<$PrismaModel> | string;
  };

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntFilter<$PrismaModel> | number;
  };

  export type NestedEnumSeatStartFromFilter<$PrismaModel = never> = {
    equals?:
      | $Enums.SeatStartFrom
      | EnumSeatStartFromFieldRefInput<$PrismaModel>;
    in?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    notIn?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    not?: NestedEnumSeatStartFromFilter<$PrismaModel> | $Enums.SeatStartFrom;
  };

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string;
  };

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedStringFilter<$PrismaModel>;
    _max?: NestedStringFilter<$PrismaModel>;
  };

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number;
    _count?: NestedIntFilter<$PrismaModel>;
    _avg?: NestedFloatFilter<$PrismaModel>;
    _sum?: NestedIntFilter<$PrismaModel>;
    _min?: NestedIntFilter<$PrismaModel>;
    _max?: NestedIntFilter<$PrismaModel>;
  };

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>;
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>;
    lt?: number | FloatFieldRefInput<$PrismaModel>;
    lte?: number | FloatFieldRefInput<$PrismaModel>;
    gt?: number | FloatFieldRefInput<$PrismaModel>;
    gte?: number | FloatFieldRefInput<$PrismaModel>;
    not?: NestedFloatFilter<$PrismaModel> | number;
  };

  export type NestedEnumSeatStartFromWithAggregatesFilter<
    $PrismaModel = never,
  > = {
    equals?:
      | $Enums.SeatStartFrom
      | EnumSeatStartFromFieldRefInput<$PrismaModel>;
    in?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    notIn?:
      | $Enums.SeatStartFrom[]
      | ListEnumSeatStartFromFieldRefInput<$PrismaModel>;
    not?:
      | NestedEnumSeatStartFromWithAggregatesFilter<$PrismaModel>
      | $Enums.SeatStartFrom;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumSeatStartFromFilter<$PrismaModel>;
    _max?: NestedEnumSeatStartFromFilter<$PrismaModel>;
  };
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<
          Required<NestedJsonFilterBase<$PrismaModel>>,
          Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>
        >,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>;

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?:
      | InputJsonValue
      | JsonFieldRefInput<$PrismaModel>
      | JsonNullValueFilter;
    path?: string[];
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>;
    string_contains?: string | StringFieldRefInput<$PrismaModel>;
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>;
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>;
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null;
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>;
    not?:
      | InputJsonValue
      | JsonFieldRefInput<$PrismaModel>
      | JsonNullValueFilter;
  };

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedDateTimeFilter<$PrismaModel>;
    _max?: NestedDateTimeFilter<$PrismaModel>;
  };

  export type TripCreateWithoutBusInput = {
    id?: string;
    presence_time: Date | string;
    departureDate: Date | string;
    departureTime: Date | string;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date | string;
    arrivalDate: Date | string;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TripUncheckedCreateWithoutBusInput = {
    id?: string;
    presence_time: Date | string;
    departureDate: Date | string;
    departureTime: Date | string;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date | string;
    arrivalDate: Date | string;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TripCreateOrConnectWithoutBusInput = {
    where: TripWhereUniqueInput;
    create: XOR<TripCreateWithoutBusInput, TripUncheckedCreateWithoutBusInput>;
  };

  export type TripCreateManyBusInputEnvelope = {
    data: TripCreateManyBusInput | TripCreateManyBusInput[];
    skipDuplicates?: boolean;
  };

  export type TripUpsertWithWhereUniqueWithoutBusInput = {
    where: TripWhereUniqueInput;
    update: XOR<TripUpdateWithoutBusInput, TripUncheckedUpdateWithoutBusInput>;
    create: XOR<TripCreateWithoutBusInput, TripUncheckedCreateWithoutBusInput>;
  };

  export type TripUpdateWithWhereUniqueWithoutBusInput = {
    where: TripWhereUniqueInput;
    data: XOR<TripUpdateWithoutBusInput, TripUncheckedUpdateWithoutBusInput>;
  };

  export type TripUpdateManyWithWhereWithoutBusInput = {
    where: TripScalarWhereInput;
    data: XOR<
      TripUpdateManyMutationInput,
      TripUncheckedUpdateManyWithoutBusInput
    >;
  };

  export type TripScalarWhereInput = {
    AND?: TripScalarWhereInput | TripScalarWhereInput[];
    OR?: TripScalarWhereInput[];
    NOT?: TripScalarWhereInput | TripScalarWhereInput[];
    id?: StringFilter<'Trip'> | string;
    busId?: StringFilter<'Trip'> | string;
    presence_time?: DateTimeFilter<'Trip'> | Date | string;
    departureDate?: DateTimeFilter<'Trip'> | Date | string;
    departureTime?: DateTimeFilter<'Trip'> | Date | string;
    fromState?: StringFilter<'Trip'> | string;
    fromCity?: StringFilter<'Trip'> | string;
    fromStation?: StringFilter<'Trip'> | string;
    arrivalTime?: DateTimeFilter<'Trip'> | Date | string;
    arrivalDate?: DateTimeFilter<'Trip'> | Date | string;
    toState?: StringFilter<'Trip'> | string;
    toCity?: StringFilter<'Trip'> | string;
    toStation?: StringFilter<'Trip'> | string;
    createdAt?: DateTimeFilter<'Trip'> | Date | string;
    updatedAt?: DateTimeFilter<'Trip'> | Date | string;
  };

  export type BusCreateWithoutTripsInput = {
    id?: string;
    name: string;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: $Enums.SeatStartFrom;
    plate: JsonNullValueInput | InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type BusUncheckedCreateWithoutTripsInput = {
    id?: string;
    name: string;
    chairs: number;
    left: number;
    right: number;
    seatStartFrom: $Enums.SeatStartFrom;
    plate: JsonNullValueInput | InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type BusCreateOrConnectWithoutTripsInput = {
    where: BusWhereUniqueInput;
    create: XOR<
      BusCreateWithoutTripsInput,
      BusUncheckedCreateWithoutTripsInput
    >;
  };

  export type BusUpsertWithoutTripsInput = {
    update: XOR<
      BusUpdateWithoutTripsInput,
      BusUncheckedUpdateWithoutTripsInput
    >;
    create: XOR<
      BusCreateWithoutTripsInput,
      BusUncheckedCreateWithoutTripsInput
    >;
    where?: BusWhereInput;
  };

  export type BusUpdateToOneWithWhereWithoutTripsInput = {
    where?: BusWhereInput;
    data: XOR<BusUpdateWithoutTripsInput, BusUncheckedUpdateWithoutTripsInput>;
  };

  export type BusUpdateWithoutTripsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    chairs?: IntFieldUpdateOperationsInput | number;
    left?: IntFieldUpdateOperationsInput | number;
    right?: IntFieldUpdateOperationsInput | number;
    seatStartFrom?:
      | EnumSeatStartFromFieldUpdateOperationsInput
      | $Enums.SeatStartFrom;
    plate?: JsonNullValueInput | InputJsonValue;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type BusUncheckedUpdateWithoutTripsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    chairs?: IntFieldUpdateOperationsInput | number;
    left?: IntFieldUpdateOperationsInput | number;
    right?: IntFieldUpdateOperationsInput | number;
    seatStartFrom?:
      | EnumSeatStartFromFieldUpdateOperationsInput
      | $Enums.SeatStartFrom;
    plate?: JsonNullValueInput | InputJsonValue;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TripCreateManyBusInput = {
    id?: string;
    presence_time: Date | string;
    departureDate: Date | string;
    departureTime: Date | string;
    fromState: string;
    fromCity: string;
    fromStation: string;
    arrivalTime: Date | string;
    arrivalDate: Date | string;
    toState: string;
    toCity: string;
    toStation: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TripUpdateWithoutBusInput = {
    id?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TripUncheckedUpdateWithoutBusInput = {
    id?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TripUncheckedUpdateManyWithoutBusInput = {
    id?: StringFieldUpdateOperationsInput | string;
    presence_time?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    departureTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    fromState?: StringFieldUpdateOperationsInput | string;
    fromCity?: StringFieldUpdateOperationsInput | string;
    fromStation?: StringFieldUpdateOperationsInput | string;
    arrivalTime?: DateTimeFieldUpdateOperationsInput | Date | string;
    arrivalDate?: DateTimeFieldUpdateOperationsInput | Date | string;
    toState?: StringFieldUpdateOperationsInput | string;
    toCity?: StringFieldUpdateOperationsInput | string;
    toStation?: StringFieldUpdateOperationsInput | string;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number;
  };

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF;
}
