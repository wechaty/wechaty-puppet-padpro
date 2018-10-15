// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var PadchatGrpc_pb = require('./PadchatGrpc_pb.js');

function serialize_GrpcPadchat_PackLongRequest(arg) {
  if (!(arg instanceof PadchatGrpc_pb.PackLongRequest)) {
    throw new Error('Expected argument of type GrpcPadchat.PackLongRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_GrpcPadchat_PackLongRequest(buffer_arg) {
  return PadchatGrpc_pb.PackLongRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_GrpcPadchat_PackLongResponse(arg) {
  if (!(arg instanceof PadchatGrpc_pb.PackLongResponse)) {
    throw new Error('Expected argument of type GrpcPadchat.PackLongResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_GrpcPadchat_PackLongResponse(buffer_arg) {
  return PadchatGrpc_pb.PackLongResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_GrpcPadchat_PackShortRequest(arg) {
  if (!(arg instanceof PadchatGrpc_pb.PackShortRequest)) {
    throw new Error('Expected argument of type GrpcPadchat.PackShortRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_GrpcPadchat_PackShortRequest(buffer_arg) {
  return PadchatGrpc_pb.PackShortRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_GrpcPadchat_PackShortResponse(arg) {
  if (!(arg instanceof PadchatGrpc_pb.PackShortResponse)) {
    throw new Error('Expected argument of type GrpcPadchat.PackShortResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_GrpcPadchat_PackShortResponse(buffer_arg) {
  return PadchatGrpc_pb.PackShortResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_GrpcPadchat_ParseRequest(arg) {
  if (!(arg instanceof PadchatGrpc_pb.ParseRequest)) {
    throw new Error('Expected argument of type GrpcPadchat.ParseRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_GrpcPadchat_ParseRequest(buffer_arg) {
  return PadchatGrpc_pb.ParseRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_GrpcPadchat_ParsedResponse(arg) {
  if (!(arg instanceof PadchatGrpc_pb.ParsedResponse)) {
    throw new Error('Expected argument of type GrpcPadchat.ParsedResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_GrpcPadchat_ParsedResponse(buffer_arg) {
  return PadchatGrpc_pb.ParsedResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// Grpc Service for authorization, pack and unpack message usages
var PadchatGrpcService = exports.PadchatGrpcService = {
  packLong: {
    path: '/GrpcPadchat.PadchatGrpc/PackLong',
    requestStream: false,
    responseStream: false,
    requestType: PadchatGrpc_pb.PackLongRequest,
    responseType: PadchatGrpc_pb.PackLongResponse,
    requestSerialize: serialize_GrpcPadchat_PackLongRequest,
    requestDeserialize: deserialize_GrpcPadchat_PackLongRequest,
    responseSerialize: serialize_GrpcPadchat_PackLongResponse,
    responseDeserialize: deserialize_GrpcPadchat_PackLongResponse,
  },
  packShort: {
    path: '/GrpcPadchat.PadchatGrpc/PackShort',
    requestStream: false,
    responseStream: false,
    requestType: PadchatGrpc_pb.PackShortRequest,
    responseType: PadchatGrpc_pb.PackShortResponse,
    requestSerialize: serialize_GrpcPadchat_PackShortRequest,
    requestDeserialize: deserialize_GrpcPadchat_PackShortRequest,
    responseSerialize: serialize_GrpcPadchat_PackShortResponse,
    responseDeserialize: deserialize_GrpcPadchat_PackShortResponse,
  },
  parse: {
    path: '/GrpcPadchat.PadchatGrpc/Parse',
    requestStream: false,
    responseStream: false,
    requestType: PadchatGrpc_pb.ParseRequest,
    responseType: PadchatGrpc_pb.ParsedResponse,
    requestSerialize: serialize_GrpcPadchat_ParseRequest,
    requestDeserialize: deserialize_GrpcPadchat_ParseRequest,
    responseSerialize: serialize_GrpcPadchat_ParsedResponse,
    responseDeserialize: deserialize_GrpcPadchat_ParsedResponse,
  },
};

exports.PadchatGrpcClient = grpc.makeGenericClientConstructor(PadchatGrpcService);
