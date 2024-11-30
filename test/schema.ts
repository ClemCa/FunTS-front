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
               $: ({UID}: {UID: string}) => {ID: string, name: string, status: string, languages: string[], typing: boolean, presence: "online" | "busy" | "away" | "offline", banner: string, servers: string[]}[]
            },
            theme: {
               $: ({UID}: {UID: string}) => {name: string, tailwind: string[], rgb: string[]}[]
            },
            server: {
               $: ({UID}: {UID: string}) => {ID: string, name: string, icon: string, banner: string, channels: string[], members: string[]}[]
            },
            channel: {
               $: ({UID}: {UID: string}) => {ID: string, name: string, status: {online: number, busy: number, away: number}, languages: string[], mode: "romanized-only" | "native-only" | "both"}[]
            },
            notification: {
               $: ({UID}: {UID: string}) => ({type: "DM", user: "1", message: "Hello, world!", timestamp: 1732929753358} | {type: "unread", channel: "mock1", user: "1", message: "Hello, world!", timestamp: 1732929753358} | {type: "mention", channel: "mock2", user: "1", message: "Hello, world!", timestamp: 1732929753358})
            },
            message: {
               $: [({UID}: {UID: string}) => {ID: string, user: string, channel: string, message: string, timestamp: number}[], ({channel, limit, offset}: {channel: string, limit: number, offset: number}) => string[]],
               $1: ({UID}: {UID: string}) => {ID: string, user: string, channel: string, message: string, timestamp: number}[],
               $2: ({channel, limit, offset}: {channel: string, limit: number, offset: number}) => string[]
            },
            language: {
               $: ({UID}: {UID: string}) => {ID: string, name: string, short: string}[]
            }
         }
      },
      test: {
         $: () => "Hello, world!"
      }
   }
const raw = {"fetch":{"mock":{"user":{"$":[{"UID":""},["clemDyn",{"ID":"","name":"","status":"","languages":[""],"typing":false,"presence":["online","busy","away","offline"],"banner":"","servers":[""]}]]},"theme":{"$":[{"UID":""},["clemDyn",{"name":"","tailwind":[""],"rgb":[""]}]]},"server":{"$":[{"UID":""},["clemDyn",{"ID":"","name":"","icon":"","banner":"","channels":[""],"members":[""]}]]},"channel":{"$":[{"UID":""},["clemDyn",{"ID":"","name":"","status":{"online":0,"busy":0,"away":0},"languages":[""],"mode":["romanized-only","native-only","both"]}]]},"notification":{"$":[{"UID":""},["clemDyn",[{"type":"DM","user":"1","message":"Hello, world!","timestamp":1732929753358},{"type":"unread","channel":"mock1","user":"1","message":"Hello, world!","timestamp":1732929753358},{"type":"mention","channel":"mock2","user":"1","message":"Hello, world!","timestamp":1732929753358}]]]},"message":{"$":[[{"UID":""},["clemDyn",{"ID":"","user":"","channel":"","message":"","timestamp":0}]],[{"channel":"","limit":0,"offset":0},["clemDyn",[""]]]],"$1":[{"UID":""},["clemDyn",{"ID":"","user":"","channel":"","message":"","timestamp":0}]],"$2":[{"channel":"","limit":0,"offset":0},["clemDyn",[""]]]},"language":{"$":[{"UID":""},["clemDyn",{"ID":"","name":"","short":""}]]}}},"test":{"$":[{},["\"Hello, world!\""]]}}
type Raw<T> = object & {"::": {}}
export const schema = {
   ...raw,
   "::": {}
} as Raw<Schema>
export default schema