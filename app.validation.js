(function (angular, jQuery, undefined) {
    angular.module('kash.validation', ['validation.provider', 'validation.directive']);

    jQuery.fn.visible = function () {
        return this.css('visibility', 'visible');
    };

    jQuery.fn.invisible = function () {
        return this.css('visibility', 'hidden');
    };
})(angular, jQuery);

(function (angular, undefined) {
    angular.module('validation.provider', [])
        .provider('$validation', Provider);

    function Provider() {

        var $rootScope, $q, $timeout;

        var that = this,
            validationExpressions = {},
            defaultMsg = {},
            isSuccessMessageShown = true,
            isErrorMessageShown = true,
            isMessageCollapsed = true,
            labelType = 'label';

        var $validation = {
            GetExpression: getExpression,
            GetDefaultMessage: getDefaultMessage,
            GetErrorHtml: getErrorHtml,
            GetSuccessHtml: getSuccessHtml,
            CheckFormValidity: checkFormValidity,
            RunValidation: runValidation,
            Reset: reset,
            GetSuccessMessageVisibility: function () { return isSuccessMessageShown; },
            GetErrorMessageVisibility: function () { return isErrorMessageShown; },
            GetMessageCollapsibility: function () { return isMessageCollapsed; },
            GetLabelType: function () { return labelType; }
        }

        var $validationProvider = {
            SetValidatorRules: setValidatorRules,
            SetValidatorMessages: setValidatorMessages,
            SetErrorHtml: setErrorHtml,
            SetSuccessHtml: setSuccessHtml,
            SetMessageCollapsibility: setMessageCollapsibility,
            SetErrorMessageVisibility: setErrorMessageVisibility,
            SetSuccessMessageVisibility: setSuccessMessageVisibility,
            SetLabelType: setLabelType,

            $get: [
                '$injector', function ($injector) {
                    // Setup the dependencies
                    $rootScope = $injector.get('$rootScope');
                    $q = $injector.get('$q');
                    $timeout = $injector.get('$timeout');

                    return $validation;
                }
            ]
        }

        $validationProvider = angular.extend(this, $validationProvider);

        ///////////////////////////////////

        function setSuccessMessageVisibility(isVisible) {
            isSuccessMessageShown = isVisible;
            return that;
        }

        function setLabelType(htmlTagName) {
            labelType = htmlTagName;
            return that;
        }

        function setValidatorRules(obj) {
            angular.extend(validationExpressions, obj);
            return that;
        };

        function setValidatorMessages(obj) {
            angular.extend(defaultMsg, obj);
            return that;
        };

        function setErrorHtml(func) {
            if (func.constructor !== Function) {
                return undefined;
            }

            $validation.GetErrorHtml = func;
            return that;
        };

        function setSuccessHtml(func) {
            if (func.constructor !== Function) {
                return undefined;
            }

            $validation.GetSuccessHtml = func;
            return that;
        };

        function setMessageCollapsibility(isCollapsed) {
            isMessageCollapsed = isCollapsed;
            return that;
        }

        function setErrorMessageVisibility(isVisible) {
            isErrorMessageShown = isVisible;
            return that;
        }

        function getExpression(exprs) {
            return validationExpressions[exprs];
        };

        function getDefaultMessage(msg) {
            return defaultMsg[msg] || {
                success: 'Default success message',
                error: 'Default error message'
            };
        };

        function getErrorHtml(message) {
            return '<p class="ng-invalid">' + message + '</p>';
        };

        function getSuccessHtml(message) {
            return '<p class="ng-valid">' + message + '</p>';
        };

        function checkFormValidity(form) {
            if (form == undefined || form.$valid == undefined) {
                return false;
            }
            return (form && form.$valid === true);
        };

        function runValidation(form) {

            var deferred = $q.defer(),
                idx = 0,
                thingsToValidate = [],
                thingsToBroadcast = [],
                formsToValidate = [],
                formPromises = [];

            if (form == undefined) {
                console.error('This is not a regular Form name scope');
                deferred.reject('This is not a regular Form name scope');
                return deferred.promise;
            }

            for (var name in form) {
                if (name[0] !== '$' && form[name].hasOwnProperty('$dirty')) {

                    // Check if we have sub forms to validate
                    var formField = form[name];
                    if (formField.constructor.name === 'FormController') {
                        formsToValidate.push(formField);
                        continue;
                    }

                    var id = formField.validationId;

                    // Set up the receiver to know a field has finished validation (regardless of validity)
                    // Skip anything without an id because it doesn't have a validator
                    if (id != null) {
                        $rootScope.$on(name + '-validated-' + id, function (validatorId) {
                            return function () {
                                var index = thingsToValidate.indexOf(validatorId);
                                thingsToValidate.splice(index, 1);
                                if (thingsToValidate.length === 0) {
                                    validationComplete();
                                }
                            }
                        }(id));
                        thingsToValidate.push(id);
                    }

                    // Add to broadcast list
                    thingsToBroadcast.push({ name: name, id: id, idx: idx++ });
                }
            }

            for (var j = 0; j < thingsToBroadcast.length; j++) {
                var ttb = thingsToBroadcast[j];
                $rootScope.$broadcast(ttb.name + '-submit-' + ttb.id, ttb.idx);
            }

            for (var i = 0; i < formsToValidate.length; i++) {
                formPromises.push(runValidation(formsToValidate[i]));
            }

            deferred.promise.success = function (fn) {
                deferred.promise.then(function (value) {
                    fn(value);
                });
                return deferred.promise;
            };

            deferred.promise.error = function (fn) {
                deferred.promise.then(null, function (value) {
                    fn(value);
                });
                return deferred.promise;
            };

            if (thingsToValidate.length === 0) {
                validationComplete();
            }

            function validationComplete() {
                $q.when(formPromises)
                    .finally(function () {
                        if ($validation.CheckFormValidity(form)) {
                            deferred.resolve('success');
                        } else {
                            deferred.reject('error');
                        }
                    });
            }

            return deferred.promise;
        };

        function reset(form) {
            if (form == undefined) {
                console.error('This is not a regular Form name scope');
                return;
            }

            if (form.validationId) {
                $rootScope.$broadcast(form.$name + '-reset-' + form.validationId);
            } else if (form.constructor === Array) {
                for (var k in form) {
                    if (form.hasOwnProperty(k)) {
                        $rootScope.$broadcast(form[k].$name + '-reset-' + form[k].validationId);
                    }
                }
            } else {
                for (var i in form) {
                    if (i[0] !== '$' && form[i].hasOwnProperty('$dirty')) {
                        $rootScope.$broadcast(i + '-reset-' + form[i].validationId);
                    }
                }
            }
        };
    }
})(angular);

(function (angular, undefined) {
    angular.module('validation.directive', ['validation.provider'])
        .directive('validator', ValidatorDirective)
        .directive('validationForm', [
            '$injector',
            function ($injector) {

                var $validation = $injector.get('$validation'),
                    $timeout = $injector.get('$timeout'),
                    $parse = $injector.get('$parse'),
                    $location = $injector.get('$location');

                return {
                    priority: 1, // execute before ng-click (0)
                    require: '?ngClick',
                    link: function (scope, element, attrs) {

                        $timeout(function () {
                            // Disable ng-click event propagation
                            element.off('click');
                            element.on('click', function (e) {
                                e.preventDefault();
                                element.prop('disabled', true);

                                var form = $parse(attrs.validationForm)(scope);
                                $validation.RunValidation(form)
                                    .success(function () {
                                        if (attrs.ngClick) {
                                            $parse(attrs.ngClick)(scope);
                                        } else if (attrs.href) {
                                            $location.path(attrs.href);
                                        }
                                    })
                                    .error(function () {
                                        // Run the parse last. This means that they can do their own focus logic
                                        $parse(attrs.validationError)(scope);
                                    })
                                    .finally(function () {
                                        element.prop('disabled', false);
                                    });
                            });
                        });

                    }
                };
            }
        ])
        .directive('validationReset', [
            '$injector',
            function ($injector) {

                var $validationProvider = $injector.get('$validation'),
                    $timeout = $injector.get('$timeout'),
                    $parse = $injector.get('$parse');

                return {
                    link: function (scope, element, attrs) {
                        var form = $parse(attrs.validationReset)(scope);

                        $timeout(function () {
                            element.on('click', function (e) {
                                e.preventDefault();
                                $validationProvider.Reset(form);
                            });
                        });

                    }
                };
            }
        ]);

    ValidatorDirective.$inject = ['$validation', '$q', '$timeout'];

    function ValidatorDirective($validation, $q, $timeout) {
        
        var focusElements = [];
        var baseValidatorObject = {
            validateIf: undefined,
            variable: 0,
            success: angular.noop,
            successMessage: '',
            error: angular.noop,
            errorMessage: '',
            final: angular.noop,
            customRule: undefined
        }

        var directiveRecipe = {
            restrict: 'A',
            priority: 1,
            require: ['ngModel', '^form'],
            scope: {
                model: '=ngModel', //used for watch
                validatorField: '&validator',
                initialValidity: '=',
                groupValidCallback: '&',
                groupInvalidCallback: '&',
                groupFinallyCallback: '&',
                messageId: '@',
                labelId: '@',
                focusId: '@'
            },
            link: linkFn,
            controller: ['$scope',
                function ($scope) {

                }
            ]
        }

        return directiveRecipe;

        ////////////////////////////////////

        function linkFn($scope, $element, $attrs, controllers) {

            var $ngModelController = controllers[0],
                $ngForm = controllers[1];
            // remove all validators that aren't applied by this framework
            for (var v in $ngModelController.$validators) {
                if ($ngModelController.$validators.hasOwnProperty(v)) {
                    delete $ngModelController.$validators[v];
                }
            }

            if (!$attrs.name) {
                throw 'The element with a validator does not have a name attribute.' +
                    ' The validation will not work without one: ' + $element;
            }

            // Grab the values
            $scope.validators = $scope.validatorField();

            if ($attrs.validators === '' || !$scope.validators) {
                throw 'Validator cannot be empty. It must be the name of a validator, or an object representing a validator';
            };

            // Set up validator object; either simple or complex constructor
            if (typeof $scope.validators !== 'object' || Array.isArray($scope.validators)) {
                $scope.validators = buildSimpleValidator($scope.validators);
            } else {
                for (var key in $scope.validators) {
                    if ($scope.validators.hasOwnProperty(key)) {
                        var base = angular.extend({}, baseValidatorObject);
                        $scope.validators[key] = angular.extend(base, $scope.validators[key]);
                        $scope.validators[key].deregisterWatch = angular.noop;
                    }
                }
            }

            var lv = {
                uid: guid(),
                deregisterModelWatch: angular.noop,
                optionalValidators: {},
                messageElement: findOrCreateMessageElement,
                shouldMessageCollapse: $validation.GetMessageCollapsibility()
            }
            $ngModelController.validationId = lv.uid;

            //var foundOpVals = findOptionalValidators();
            addOptionalValidatorWatches( /*foundOpVals*/);
            addInputLabelWatch(); // If we have a label right before the input, we can add a watch to update the label if there are errors
            setInitialValidityOfController(); // Uses the initial validity if there is one on the scope, else true
            addResetBroadcastListener();
            addSubmitBroadcastListener();
            addValidationMethod();

            if ($attrs.noValidationMessage === true || $attrs.noValidationMessage === 'true') {
                hideMessage();
            }
            setMessageElementText('');

            ////////////////////////////////

            function isTruthy(input, value, fieldName, scope, currentForm) {
                if (typeof input === 'boolean') {
                    return input;
                }
                if (typeof input === 'function') {
                    return input(value, fieldName, scope, currentForm);
                }
                if (typeof input === 'string') {
                    return input.toLowerCase() === 'true';
                }
                return false;
            }

            function setMessageElementText(message) {
                lv.messageElement().html($validation.GetErrorHtml(message || 'No message to display'));
                if (!message) hideMessage();
            }

            function hideMessage() {
                if (lv.shouldMessageCollapse === true) {
                    lv.messageElement().hide();
                } else {
                    lv.messageElement().invisible();
                }
            }

            function showMessage() {
                if (lv.shouldMessageCollapse === true) {
                    lv.messageElement().show();
                } else {
                    lv.messageElement().visible();
                }
            }

            function addOptionalValidatorWatches() {

                var foundOptionalValidators = [];

                for (var key in $scope.validators) {
                    if ($scope.validators.hasOwnProperty(key)) {
                        var validator = $scope.validators[key];
                        if (validator.validateIf != undefined) {
                            foundOptionalValidators.push(validator);
                        }
                    }
                }

                lv.registerOptionalWatches = function () {
                    for (var j = 0; j < foundOptionalValidators.length; j++) {
                        var currValidator = foundOptionalValidators[j];

                        // If we aren't in submit mode, register the optional validators. Otherwise, it remains noop
                        if ($attrs.validMethod !== 'submit' && $attrs.validMethod !== 'submit-only') {
                            registerValidatorWatch(currValidator);
                        }
                    }
                }

                lv.deregisterOptionalWatches = function () {
                    for (var j = 0; j < foundOptionalValidators.length; j++) {
                        foundOptionalValidators[j].deregisterWatch();
                    }
                }

                lv.registerOptionalWatches();
            }

            function registerValidatorWatch(validator) {
                var firstWatchComplete = false;
                validator.deregisterWatch = $scope.$watch(function (scope) { return isTruthy(validator.validateIf, scope.model, $ngModelController.$name, $scope, $ngForm); }, function () {
                    if (firstWatchComplete && $attrs.validMethod !== 'submit' && $attrs.validMethod !== 'submit-only') {
                        checkValidation($scope.validators, $ngModelController.$modelValue || '');
                    }
                    firstWatchComplete = true;
                });
            }

            function addInputLabelWatch() {
                $scope.$watch(function () { return $ngModelController.$valid; }, function (isValid) {
                    if (isValid) {
                        findOrGuessLabelElement().removeClass('ng-invalid');
                    } else {
                        findOrGuessLabelElement().addClass('ng-invalid');
                    }
                });
            }

            function findOrCreateMessageElement() {
                var newElement;
                if (!$scope.messageId) {
                    newElement = document.createElement('span');
                    newElement.id = guid();
                    $scope.messageId = newElement.id;
                    newElement = angular.element(newElement);
                    $element.after(newElement);
                } else {
                    newElement = angular.element('#' + $scope.messageId);
                }
                return newElement;
            }

            function findOrGuessLabelElement() {
                var labelElement;
                if (!$scope.labelId) {
                    labelElement = $element.siblings($validation.GetLabelType());
                } else {
                    labelElement = $(document.querySelector('#' + $scope.labelId));
                }
                return labelElement;
            }

            function setInitialValidityOfController() {
                var initialValidity = true;
                // Check if initialValidity is set
                if (typeof $scope.initialValidity === 'boolean') {
                    initialValidity = $scope.initialValidity;
                }
                $ngModelController.$setValidity($ngModelController.$name, initialValidity);
                //initialValidity ? hideMessage() : showMessage();
            }

            function addResetBroadcastListener() {
                // Add a watch for the reset broadcast
                $scope.$on($ngModelController.$name + '-reset-' + lv.uid, function () {

                    lv.deregisterModelWatch();
                    for (var validator in lv.optionalWatches) {
                        if (lv.optionalWatches.hasOwnProperty(validator)) {
                            validator.deregisterOptionalWatch();
                        }
                    }

                    $ngModelController.$setViewValue('');
                    $ngModelController.$setPristine();
                    $ngModelController.$setValidity($ngModelController.$name, undefined);
                    $ngModelController.$render();

                    // clear the message
                    setMessageElementText('');
                });
            }

            function addSubmitBroadcastListener() {
                $scope.$on($ngModelController.$name + '-submit-' + lv.uid, function (event, index) {
                    var value = $ngModelController.$modelValue == undefined ? '' : $ngModelController.$modelValue;
                    var validityPromise = checkValidation($scope.validators, value);

                    if ($attrs.validMethod === 'submit') {
                        lv.deregisterModelWatch(); // clear previous scope.$watch
                        lv.deregisterModelWatch = $scope.$watch('model', function (newValue, oldValue) {

                            // don't watch when init
                            if (newValue === oldValue) {
                                return;
                            }

                            checkValidation($scope.validators, newValue);
                        });

                        lv.deregisterOptionalWatches();
                        lv.registerOptionalWatches();
                    }

                    validityPromise.catch(setFocus);

                    function setFocus() {

                        focusElements[index] = $element[0];

                        $timeout(function () {
                            var focusElement = focusElements[Math.min.apply(null, Object.keys(focusElements))];
                            var elementLite = angular.element(focusElement);
                            if (elementLite.attr('focus-id')) {
                                angular.element('#' + elementLite.attr('focus-id')).focus();
                            } else {
                                elementLite.focus();
                            }
                            focusElements.length = 0;
                        }, 0);

                    }
                });
            }

            function addValidationMethod() {
                // Validate blur method
                if ($attrs.validMethod === 'blur') {
                    $element.bind('blur', function () {
                        var value = $ngModelController.$modelValue;
                        $scope.$apply(function () {
                            checkValidation($scope.validators, value)
                                .then($scope.groupValidCallback, $scope.groupInvalidCallback)
                                .finally($scope.groupFinallyCallback);;
                        });
                    });

                    return;
                }

                // Validate submit & submit-only method
                if ($attrs.validMethod === 'submit' || $attrs.validMethod === 'submit-only') {
                    hideMessage();
                    return;
                }

                // Validate watch method (default)
                $scope.$watch('model', function (value) {

                    if ($ngModelController.$pristine && $ngModelController.$modelValue) {
                        $ngModelController.$setViewValue($ngModelController.$modelValue);
                    } else if ($ngModelController.$pristine) {
                        setMessageElementText('');
                        return;
                    }

                    checkValidation($scope.validators, value)
                        .then($scope.groupValidCallback, $scope.groupInvalidCallback)
                        .finally($scope.groupFinallyCallback);;
                }, true);
            }

            function buildValidator(validators, value) {
                var current = {},
                    name = '',
                    remaining = angular.extend({}, validators);

                for (var propertyName in validators) {
                    if (validators.hasOwnProperty(propertyName)) {
                        current = validators[propertyName];
                        name = propertyName;
                        delete remaining[propertyName];
                        break;
                    }
                }

                return {
                    Name: name,
                    Remaining: remaining,
                    Rule: current.customRule ? current.customRule : $validation.GetExpression(name),
                    Variable: typeof current.variable !== 'function'
                        ? function () { return current.variable }
                        : current.variable,
                    ValidationOptional: current.validateIf != undefined,
                    ShouldValidate: function (value) { return isTruthy(current.validateIf, value, $ngModelController.$name, $scope, $ngForm); },
                    Success: function () {
                        individualValidatorSuccess(current.successMessage, name);
                        current.success();
                        if (Object.keys(remaining).length) {
                            return checkValidation(remaining, value);
                        } else {
                            current.final();
                            $scope.$root.$broadcast($ngModelController.$name + '-validated-' + lv.uid, true);
                            return $q.when(true);
                        }
                    },
                    Error: function () {
                        current.error();
                        current.final();
                        individualValidatorError(current.errorMessage, name);
                        $scope.$root.$broadcast($ngModelController.$name + '-validated-' + lv.uid, false);
                        $scope.$root.$broadcast('$validationError', function (scopeProps) {
                            var vs = [];

                            for (var val in $scope.validators) {
                                if ($scope.validators.hasOwnProperty(val)) {
                                    vs.push(val);
                                }
                            }

                            return {
                                validators: vs,
                                element: $element,

                            }
                        });
                        return $q.reject();
                    }
                }
            }

            function checkValidation(validators, value) {

                var currentValidator = buildValidator(validators, value);
                var promise;

                // Make sure there is a rule set up. if not, error out
                if (currentValidator.Rule == undefined) {
                    console.error('You are using undefined validator: "%s"', currentValidator.Type);
                    promise = $q.reject();
                }
                    // Check if validator is possibly optional
                else if (currentValidator.ValidationOptional && !currentValidator.ShouldValidate(value)) {
                    // If validation expression results in false, it should not be evaluated
                    promise = currentValidator.Success();
                }
                    // Check with Function
                else if (currentValidator.Rule.constructor === Function) {
                    promise = $q.when(currentValidator.Rule(value, $scope, $element, $attrs, currentValidator.Variable()))
                        .then(function (result) {
                            return result ? currentValidator.Success() : currentValidator.Error();
                        }, currentValidator.Error);
                }
                    // Check with RegExp
                else if (currentValidator.Rule.constructor === RegExp) {
                    value = value || ''; // empty controls would yield undefined and automatically error out
                    promise = currentValidator.Rule.test(value) ? currentValidator.Success() : currentValidator.Error();
                } else {
                    promise = currentValidator.Error();
                }

                return promise;
            }

            function individualValidatorSuccess(validMessage, validatorName) {
                var messageToShow = validMessage || $validation.GetDefaultMessage(validatorName).success;

                if ($validation.GetSuccessMessageVisibility() && messageToShow) {
                    setMessageElementText(messageToShow);
                    showMessage();
                } else {
                    hideMessage();
                }
                $ngModelController.$setValidity($ngModelController.$name, true);
            }

            function individualValidatorError(validMessage, validatorName) {
                var messageToShow = validMessage || $validation.GetDefaultMessage(validatorName).error;

                if ($validation.GetErrorMessageVisibility() && messageToShow) {
                    setMessageElementText(messageToShow);
                    showMessage();
                } else {
                    hideMessage();
                }
                $ngModelController.$setValidity($ngModelController.$name, false);
            };

        }

        function buildSimpleValidator(simpleValidators) {

            var base = {}, input, index, newValidators = {};

            if (Array.isArray(simpleValidators)) {
                for (var i = 0; i < simpleValidators.length; i++) {
                    input = simpleValidators[i];
                    index = input.indexOf('=');
                    if (index !== -1) base['variable'] = input.substr(index + 1);
                    newValidators[input.substr(0, index !== -1 ? index : undefined)] = angular.extend(base, baseValidatorObject);
                    newValidators[input.substr(0, index !== -1 ? index : undefined)].deregisterWatch = angular.noop;
                }
            } else {
                input = simpleValidators;
                index = input.indexOf('=');
                if (index !== -1) base['variable'] = input.substr(index + 1);
                newValidators[input.substr(0, index !== -1 ? index : undefined)] = angular.extend(base, baseValidatorObject);
                newValidators[input.substr(0, index !== -1 ? index : undefined)].deregisterWatch = angular.noop;
            }

            return newValidators;
        }

        function s4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        function guid() {
            return (s4() + s4() + s4() + s4());
        }
    }

    function ValidationFormDirective() {

    }

    function ValidationResetDirective() {

    }

})(angular);