class apiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        };

        this.toJSON = function () {
            return {
                success: this.success,
                message: this.message,
                errors: this.errors,
                data: this.data,
            };
        };
    };
};

export { apiError }