// package: GrpcPadchat
// file: PadchatGrpc.proto

/* eslint:disable */

import * as jspb from "google-protobuf";

export class PackLongRequest extends jspb.Message { 
    getToken(): string;
    setToken(value: string): void;

    getApiname(): string;
    setApiname(value: string): void;

    getParams(): string;
    setParams(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackLongRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PackLongRequest): PackLongRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackLongRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackLongRequest;
    static deserializeBinaryFromReader(message: PackLongRequest, reader: jspb.BinaryReader): PackLongRequest;
}

export namespace PackLongRequest {
    export type AsObject = {
        token: string,
        apiname: string,
        params: string,
    }
}

export class PackLongResponse extends jspb.Message { 
    getBuffer(): Uint8Array | string;
    getBuffer_asU8(): Uint8Array;
    getBuffer_asB64(): string;
    setBuffer(value: Uint8Array | string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackLongResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PackLongResponse): PackLongResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackLongResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackLongResponse;
    static deserializeBinaryFromReader(message: PackLongResponse, reader: jspb.BinaryReader): PackLongResponse;
}

export namespace PackLongResponse {
    export type AsObject = {
        buffer: Uint8Array | string,
    }
}

export class PackShortRequest extends jspb.Message { 
    getToken(): string;
    setToken(value: string): void;

    getApiname(): string;
    setApiname(value: string): void;

    getParams(): string;
    setParams(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackShortRequest.AsObject;
    static toObject(includeInstance: boolean, msg: PackShortRequest): PackShortRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackShortRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackShortRequest;
    static deserializeBinaryFromReader(message: PackShortRequest, reader: jspb.BinaryReader): PackShortRequest;
}

export namespace PackShortRequest {
    export type AsObject = {
        token: string,
        apiname: string,
        params: string,
    }
}

export class PackShortResponse extends jspb.Message { 
    getCommandurl(): string;
    setCommandurl(value: string): void;

    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): PackShortResponse.AsObject;
    static toObject(includeInstance: boolean, msg: PackShortResponse): PackShortResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: PackShortResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): PackShortResponse;
    static deserializeBinaryFromReader(message: PackShortResponse, reader: jspb.BinaryReader): PackShortResponse;
}

export namespace PackShortResponse {
    export type AsObject = {
        commandurl: string,
        payload: Uint8Array | string,
    }
}

export class ParseRequest extends jspb.Message { 
    getToken(): string;
    setToken(value: string): void;

    getApiname(): string;
    setApiname(value: string): void;

    getPayload(): Uint8Array | string;
    getPayload_asU8(): Uint8Array;
    getPayload_asB64(): string;
    setPayload(value: Uint8Array | string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ParseRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ParseRequest): ParseRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ParseRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ParseRequest;
    static deserializeBinaryFromReader(message: ParseRequest, reader: jspb.BinaryReader): ParseRequest;
}

export namespace ParseRequest {
    export type AsObject = {
        token: string,
        apiname: string,
        payload: Uint8Array | string,
    }
}

export class ParsedResponse extends jspb.Message { 
    getPayload(): string;
    setPayload(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ParsedResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ParsedResponse): ParsedResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ParsedResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ParsedResponse;
    static deserializeBinaryFromReader(message: ParsedResponse, reader: jspb.BinaryReader): ParsedResponse;
}

export namespace ParsedResponse {
    export type AsObject = {
        payload: string,
    }
}