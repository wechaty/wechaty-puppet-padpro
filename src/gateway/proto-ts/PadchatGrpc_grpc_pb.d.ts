// package: GrpcPadchat
// file: PadchatGrpc.proto

/* eslint:disable */

import * as grpc from 'grpc';
import * as PadchatGrpc_pb from './PadchatGrpc_pb';

interface IPadchatGrpcService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    packLong: IPadchatGrpcService_IPackLong;
    packShort: IPadchatGrpcService_IPackShort;
    parse: IPadchatGrpcService_IParse;
}

interface IPadchatGrpcService_IPackLong extends grpc.MethodDefinition<PadchatGrpc_pb.PackLongRequest, PadchatGrpc_pb.PackLongResponse> {
    path: string; // "/GrpcPadchat.PadchatGrpc/PackLong"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<PadchatGrpc_pb.PackLongRequest>;
    requestDeserialize: grpc.deserialize<PadchatGrpc_pb.PackLongRequest>;
    responseSerialize: grpc.serialize<PadchatGrpc_pb.PackLongResponse>;
    responseDeserialize: grpc.deserialize<PadchatGrpc_pb.PackLongResponse>;
}
interface IPadchatGrpcService_IPackShort extends grpc.MethodDefinition<PadchatGrpc_pb.PackShortRequest, PadchatGrpc_pb.PackShortResponse> {
    path: string; // "/GrpcPadchat.PadchatGrpc/PackShort"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<PadchatGrpc_pb.PackShortRequest>;
    requestDeserialize: grpc.deserialize<PadchatGrpc_pb.PackShortRequest>;
    responseSerialize: grpc.serialize<PadchatGrpc_pb.PackShortResponse>;
    responseDeserialize: grpc.deserialize<PadchatGrpc_pb.PackShortResponse>;
}
interface IPadchatGrpcService_IParse extends grpc.MethodDefinition<PadchatGrpc_pb.ParseRequest, PadchatGrpc_pb.ParsedResponse> {
    path: string; // "/GrpcPadchat.PadchatGrpc/Parse"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<PadchatGrpc_pb.ParseRequest>;
    requestDeserialize: grpc.deserialize<PadchatGrpc_pb.ParseRequest>;
    responseSerialize: grpc.serialize<PadchatGrpc_pb.ParsedResponse>;
    responseDeserialize: grpc.deserialize<PadchatGrpc_pb.ParsedResponse>;
}

export const PadchatGrpcService: IPadchatGrpcService;

export interface IPadchatGrpcServer {
    packLong: grpc.handleUnaryCall<PadchatGrpc_pb.PackLongRequest, PadchatGrpc_pb.PackLongResponse>;
    packShort: grpc.handleUnaryCall<PadchatGrpc_pb.PackShortRequest, PadchatGrpc_pb.PackShortResponse>;
    parse: grpc.handleUnaryCall<PadchatGrpc_pb.ParseRequest, PadchatGrpc_pb.ParsedResponse>;
}

export interface IPadchatGrpcClient {
    packLong(request: PadchatGrpc_pb.PackLongRequest, callback: (error: Error | null, response: PadchatGrpc_pb.PackLongResponse) => void): grpc.ClientUnaryCall;
    packLong(request: PadchatGrpc_pb.PackLongRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpc_pb.PackLongResponse) => void): grpc.ClientUnaryCall;
    packLong(request: PadchatGrpc_pb.PackLongRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpc_pb.PackLongResponse) => void): grpc.ClientUnaryCall;
    packShort(request: PadchatGrpc_pb.PackShortRequest, callback: (error: Error | null, response: PadchatGrpc_pb.PackShortResponse) => void): grpc.ClientUnaryCall;
    packShort(request: PadchatGrpc_pb.PackShortRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpc_pb.PackShortResponse) => void): grpc.ClientUnaryCall;
    packShort(request: PadchatGrpc_pb.PackShortRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpc_pb.PackShortResponse) => void): grpc.ClientUnaryCall;
    parse(request: PadchatGrpc_pb.ParseRequest, callback: (error: Error | null, response: PadchatGrpc_pb.ParsedResponse) => void): grpc.ClientUnaryCall;
    parse(request: PadchatGrpc_pb.ParseRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpc_pb.ParsedResponse) => void): grpc.ClientUnaryCall;
    parse(request: PadchatGrpc_pb.ParseRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpc_pb.ParsedResponse) => void): grpc.ClientUnaryCall;
}

export class PadchatGrpcClient extends grpc.Client implements IPadchatGrpcClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public packLong(request: PadchatGrpc_pb.PackLongRequest, callback: (error: Error | null, response: PadchatGrpc_pb.PackLongResponse) => void): grpc.ClientUnaryCall;
    public packLong(request: PadchatGrpc_pb.PackLongRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpc_pb.PackLongResponse) => void): grpc.ClientUnaryCall;
    public packLong(request: PadchatGrpc_pb.PackLongRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpc_pb.PackLongResponse) => void): grpc.ClientUnaryCall;
    public packShort(request: PadchatGrpc_pb.PackShortRequest, callback: (error: Error | null, response: PadchatGrpc_pb.PackShortResponse) => void): grpc.ClientUnaryCall;
    public packShort(request: PadchatGrpc_pb.PackShortRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpc_pb.PackShortResponse) => void): grpc.ClientUnaryCall;
    public packShort(request: PadchatGrpc_pb.PackShortRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpc_pb.PackShortResponse) => void): grpc.ClientUnaryCall;
    public parse(request: PadchatGrpc_pb.ParseRequest, callback: (error: Error | null, response: PadchatGrpc_pb.ParsedResponse) => void): grpc.ClientUnaryCall;
    public parse(request: PadchatGrpc_pb.ParseRequest, metadata: grpc.Metadata, callback: (error: Error | null, response: PadchatGrpc_pb.ParsedResponse) => void): grpc.ClientUnaryCall;
    public parse(request: PadchatGrpc_pb.ParseRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: Error | null, response: PadchatGrpc_pb.ParsedResponse) => void): grpc.ClientUnaryCall;
}