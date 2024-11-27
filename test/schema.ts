enum StatusCode {
   InfoContinue = 100,
   InfoSwitchingProtocols = 101,
   InfoProcessing = 102,
   SuccessOK = 200,
   SuccessCreated = 201,
   SuccessAccepted = 202,
   SuccessNonAuthoritativeInfo = 203,
   SuccessNoContent = 204,
   SuccessResetContent = 205,
   SuccessPartialContent = 206,
   SuccessMultiStatus = 207,
   SuccessAlreadyReported = 208,
   SuccessIMUsed = 229,
   RedirectMultipleChoices = 300,
   RedirectMovedPermanently = 301,
   RedirectFound = 302,
   RedirectSeeOther = 303,
   RedirectNotModified = 304,
   RedirectUseProxy = 305,
   RedirectSwitchProxy = 306,
   RedirectTemp = 307,
   RedirectPermanent = 308,
   ClientErrorBadRequest = 400,
   ClientErrorUnauthorized = 401,
   ClientErrorPaymentRequired = 402,
   ClientErrorForbidden = 403,
   ClientErrorNotFound = 404,
   ClientErrorMethodNotAllowed = 405,
   ClientErrorNotAcceptable = 406,
   ClientErrorProxyAuthRequired = 407,
   ClientErrorRequestTimeout = 408,
   ClientErrorConflict = 409,
   ClientErrorGone = 410,
   ClientErrorLengthRequired = 411,
   ClientErrorPreconditionFailed = 412,
   ClientErrorPayloadTooLarge = 413,
   ClientErrorURITooLong = 414,
   ClientErrorUnsupportedMediaType = 415,
   ClientErrorRangeNotSatisfiable = 416,
   ClientErrorExpectationFailed = 417,
   ClientErrorImATeapot = 418,
   ClientErrorMisdirectedRequest = 421,
   ClientErrorUnprocessableEntity = 422,
   ClientErrorLocked = 423,
   ClientErrorFailedDependency = 424,
   ClientErrorUpgradeRequired = 426,
   ClientErrorPreconditionRequired = 428,
   ClientErrorTooManyRequests = 429,
   ClientErrorRequestHeaderFieldsTooLarge = 431,
   ClientErrorLoginTimeOut = 440,
   ClientErrorRetryWith = 449,
   ClientErrorUnavailableForLegalReasons = 451,
   ServerErrorInternal = 500,
   ServerErrorNotImplemented = 501,
   ServerErrorBadGateway = 502,
   ServerErrorServiceUnavailable = 503,
   ServerErrorGatewayTimeout = 504,
   ServerErrorHTTPVersionNotSupported = 505,
   ServerErrorVariantAlsoNegotiates = 506,
   ServerErrorInsufficientStorage = 507,
   ServerErrorLoopDetected = 508,
   ServerErrorBandwidthLimitExceeded = 509,
   ServerErrorNotExtended = 510,
   ServerErrorNetworkAuthRequired = 511
}
export type Schema = {
      fetch: {
         mock: {
            user: {
               $: ({UID}: {UID: string}) => unknown
            },
            theme: {
               $: ({UID}: {UID: string}) => unknown
            },
            server: {
               $: ({UID}: {UID: string}) => unknown
            },
            channel: {
               $: ({UID}: {UID: string}) => unknown
            },
            notification: {
               $: ({UID}: {UID: string}) => unknown
            },
            message: {
               $: [({UID}: {UID: string}) => unknown, ({channel, limit, offset}: {channel: string, limit: number, offset: number}) => unknown],
               $1: ({UID}: {UID: string}) => unknown,
               $2: ({channel, limit, offset}: {channel: string, limit: number, offset: number}) => unknown
            },
            language: {
               $: ({UID}: {UID: string}) => unknown
            }
         }
      }
   }
const raw = {"fetch":{"mock":{"user":{"$":[{"UID":""},"unknown"]},"theme":{"$":[{"UID":""},"unknown"]},"server":{"$":[{"UID":""},"unknown"]},"channel":{"$":[{"UID":""},"unknown"]},"notification":{"$":[{"UID":""},"unknown"]},"message":{"$":[[{"UID":""},"unknown"],[{"channel":"","limit":0,"offset":0},"unknown"]],"$1":[{"UID":""},"unknown"],"$2":[{"channel":"","limit":0,"offset":0},"unknown"]},"language":{"$":[{"UID":""},"unknown"]}}}}
type Raw<T> = object & {"::": {}}
export const schema = {
   ...raw,
   "::": {}
} as Raw<Schema>
export default schema