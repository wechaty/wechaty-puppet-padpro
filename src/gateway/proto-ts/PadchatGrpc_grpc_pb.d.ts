// package: GrpcPadchat
// file: PadchatGrpc.proto

/* tslint:disable */

import * as grpc from 'grpc'
import * as PadchatGrpcPb from './PadchatGrpc_pb'

interface IPadchatGrpcService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    packLong: IPadchatGrpcService_IPackLong;
    packShort: IPadchatGrpcService_IPackShort;
    parse: IPadchatGrpcService_IParse;
}

interface IPadchatGrpcService_IPackLong extends grpc.MethodDefinition<PadchatGrpcPb.PackLongRequest, PadchatGrpcPb.PackLongResponse> {
    path: string; // "/GrpcPadchat.PadchatGrpc/PackLong"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<PadchatGrpcPb.PackLongRequest>;
    requestDeserialize: grpc.deserialize<PadchatGrpcPb.PackLongRequest>;
    responseSerialize: grpc.serialize<PadchatGrpcPb.PackLongResponse>;
    responseDeserialize: grpc.deserialize<PadchatGrpcPb.PackLongResponse>;
}
interface IPadchatGrpcService_IPackShort extends grpc.MethodDefinition<PadchatGrpcPb.PackShortRequest, PadchatGrpcPb.PackShortResponse> {
    path: string; // "/GrpcPadchat.PadchatGrpc/PackShort"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<PadchatGrpcPb.PackShortRequest>;
    requestDeserialize: grpc.deserialize<PadchatGrpcPb.PackShortRequest>;
    responseSerialize: grpc.serialize<PadchatGrpcPb.PackShortResponse>;
    responseDeserialize: grpc.deserialize<PadchatGrpcPb.PackShortResponse>;
}
interface IPadchatGrpcService_IParse extends grpc.MethodDefinition<PadchatGrpcPb.ParseRequest, PadchatGrpcPb.ParsedResponse> {
    path: string; // "/GrpcPadchat.PadchatGrpc/Parse"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<PadchatGrpcPb.ParseRequest>;
    requestDeserialize: grpc.deserialize<PadchatGrpcPb.ParseRequest>;
    responseSerialize: grpc.serialize<PadchatGrpcPb.ParsedResponse>;
    responseDeserialize: grpc.deserialize<PadchatGrpcPb.ParsedResponse>;
}

export const PadchatGrpcService: IPadchatGrpcService;

export interface IPadchatGrpcServer {
    packLong: grpc.handleUnaryCall<PadchatGrpcPb.PackLongRequest, PadchatGrpcPb.PackLongResponse>;
    packShort: grpc.handleUnaryCall<PadchatGrpcPb.PackShortRequest, PadchatGrpcPb.PackShortResponse>;
    parse: grpc.handleUnaryCall<PadchatGrpcPb.ParseRequest, PadchatGrpcPb.ParsedResponse>;
}

export interface IPadchatGrpcClient {
    packLong(request: PadchatGrpcPb.PackLongRequest, callback: (error: Error | null, response: PadchatGrpcPb.PackLongResponse) => void): grpc.ClientUnaryCall;
    packLong(request: PadchatGrpcPb.PackLongRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpcPb.PackLongResponse) => void): grpc.ClientUnaryCall;
    packLong(request: PadchatGrpcPb.PackLongRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpcPb.PackLongResponse) => void): grpc.ClientUnaryCall;
    packShort(request: PadchatGrpcPb.PackShortRequest, callback: (error: Error | null, response: PadchatGrpcPb.PackShortResponse) => void): grpc.ClientUnaryCall;
    packShort(request: PadchatGrpcPb.PackShortRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpcPb.PackShortResponse) => void): grpc.ClientUnaryCall;
    packShort(request: PadchatGrpcPb.PackShortRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpcPb.PackShortResponse) => void): grpc.ClientUnaryCall;
    parse(request: PadchatGrpcPb.ParseRequest, callback: (error: Error | null, response: PadchatGrpcPb.ParsedResponse) => void): grpc.ClientUnaryCall;
    parse(request: PadchatGrpcPb.ParseRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpcPb.ParsedResponse) => void): grpc.ClientUnaryCall;
    parse(request: PadchatGrpcPb.ParseRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpcPb.ParsedResponse) => void): grpc.ClientUnaryCall;
}

export class PadchatGrpcClient extends grpc.Client implements IPadchatGrpcClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public packLong(request: PadchatGrpcPb.PackLongRequest, callback: (error: Error | null, response: PadchatGrpcPb.PackLongResponse) => void): grpc.ClientUnaryCall;
    public packLong(request: PadchatGrpcPb.PackLongRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpcPb.PackLongResponse) => void): grpc.ClientUnaryCall;
    public packLong(request: PadchatGrpcPb.PackLongRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpcPb.PackLongResponse) => void): grpc.ClientUnaryCall;
    public packShort(request: PadchatGrpcPb.PackShortRequest, callback: (error: Error | null, response: PadchatGrpcPb.PackShortResponse) => void): grpc.ClientUnaryCall;
    public packShort(request: PadchatGrpcPb.PackShortRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpcPb.PackShortResponse) => void): grpc.ClientUnaryCall;
    public packShort(request: PadchatGrpcPb.PackShortRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpcPb.PackShortResponse) => void): grpc.ClientUnaryCall;
    public parse(request: PadchatGrpcPb.ParseRequest, callback: (error: Error | null, response: PadchatGrpcPb.ParsedResponse) => void): grpc.ClientUnaryCall;
    public parse(request: PadchatGrpcPb.ParseRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpcPb.ParsedResponse) => void): grpc.ClientUnaryCall;
    public parse(request: PadchatGrpcPb.ParseRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpcPb.ParsedResponse) => void): grpc.ClientUnaryCall;
}
