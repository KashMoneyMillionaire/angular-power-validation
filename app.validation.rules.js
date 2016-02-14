(function(angular, undefined) {
    angular.module('kash.validation.rules', ['kash.validation'])
        .config([
            '$validationProvider',
            function($validationProvider) {
                // Return true if the value passes the validation condition.
                // Return false if the value fails the validation condition.
                var expression = {
                    required: function (value) {
                        return value !== undefined && value !== null && value !== '';
                    },
                    url: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/,
                    email: /^$|^[^@]+@[^@]+\.[^@]+$/,
                    zipcode: /^\d{5}(-\d{4})?$/,
                    number: /^\d*$/,
                    decimalNumber: /^\d*\.?\d*$/,
                    minlength: function(value, scope, element, attrs, param) {
                        return value.length >= param;
                    },
                    maxlength: function(value, scope, element, attrs, param) {
                        return value.length <= param;
                    },
                    greaterthan: function(value, scope, element, attrs, param) {
                        var intValue = parseInt(value);
                        if (intValue === NaN) return false;
                        return value > param;
                    },
                    lessthan: function(value, scope, element, attrs, param) {
                        var intValue = parseInt(value);
                        if (intValue === NaN) return false;
                        return value < param;
                    },
                    notEmpty: function(value, scope, element, attrs, param) {
                        return value.length !== 0;
                    },
                    date: function(value, scope, element, attrs, param) {
                        if (value === '') return true;
                        var date = new Date(value);
                        return !isNaN(date);
                    },
                    time: function(value, scope, element, attrs, param) {
                        // Empty is fine
                        if (value === '') return true;

                        // Check if it validates as a date
                        var date = new Date(value);
                        var isValidDate = !isNaN(date);
                        if (isValidDate) return true;

                        // if not a date, Validate it as a string
                        var re = /^([0-1]\d):([0-5]\d)\s?([a|p]m)?$/i;
                        return re.test(value);
                    },
                    atLeastOneTrue: function(value, scope, element, attrs, param) {
                        var values = _.values(value); // turns object to array
                        var allFalse = true;
                        for (var i = 0; i < values.length; i++) {
                            if (!!values[i]) allFalse = false;
                        }
                        return !allFalse;
                    },
                    matches: function(value, scope, element, attrs, param) {
                        return value === param;
                    }
                };

                var defaultMsg = {
                    required: {
                        error: 'This field is required',
                        success: 'It\'s Required'
                    },
                    url: {
                        error: 'This should be Url',
                        success: 'It\'s Url'
                    },
                    email: {
                        error: 'This should be Email',
                        success: 'It\'s Email'
                    },
                    zipcode: {
                        error: 'This should be a 5 or 9 digit zipcode with a dash',
                        success: 'It\'s Email'
                    },
                    number: {
                        error: 'This should be Number',
                        success: 'It\'s Number'
                    },
                    decimalNumber: {
                        error: 'This should be Number',
                        success: 'It\'s a Number'
                    },
                    minlength: {
                        error: 'This should be longer',
                        success: 'Long enough!'
                    },
                    maxlength: {
                        error: 'This should be shorter',
                        success: 'Short enough!'
                    },
                    greaterthan: {
                        error: 'The provided value is less than allowed',
                        success: 'Great enough!'
                    },
                    lessthan: {
                        error: 'The provided value is more than allowed',
                        success: 'Less enough!'
                    },
                    notEmpty: {
                        error: 'Please select at least one option',
                        success: 'At least one option selected'
                    },
                    date: {
                        error: 'The value you entered is not a valid date',
                        success: 'Good date'
                    },
                    time: {
                        error: 'The value you entered is not a valid time',
                        success: 'Good time'
                    },
                    atLeastOneTrue: {
                        error: 'Please select at least one option',
                        success: 'Option(s) selected'
                    },
                    matches: {
                        error: 'The value does not match',
                        success: 'The value matches'
                    }
                };

                var expressionKeys = Object.keys(expression).sort();
                var messageKeys = Object.keys(defaultMsg).sort();
                if (JSON.stringify(expressionKeys) !== JSON.stringify(messageKeys)) {
                    throw 'The Expressions and Messages do not match for the validations. Every expression must have a message. Check your angular-validation-rules';
                }

                $validationProvider.SetValidatorRules(expression)
                    .SetValidatorMessages(defaultMsg);
            }
        ]);

})(angular);