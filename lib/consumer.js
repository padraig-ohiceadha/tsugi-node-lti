/*
 * @classdesc Provides an implementation of an IMS LTI Tool Consumer 
 * Usual usage sequence would be
 * var consumer = new lti.Consumer (consumer_key, consumer_secret, tool_provider_url);
 * var params = consumer.initialize_params();
 * params.resource_link_id = "<the tool consumer id for the LTI launch link placement>";
 * params.launch_presentation_return_url. = "<url to allow the Tool Provider to return to the tool consumer>";
 * etc.
 * consumer.sign_request (params, callback);
 * To enable support for Outcomes call enable_outcomes and pass the Outcomes endpoint 
 * and the resultSourcedId to record the score against.
 * var html = consumer.build_form(params);
 * The HTML returned can be sent to a browser to auto-submit a form to perform the launch.
 */
(function() {
  var Consumer, exports;
    var Consumer, Authentication, OutcomesConsumer, errors, exports, url, extensions, nonce,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

    url = require('url');
    nonce = require('nonce')();
    OutcomesConsumer = require('./outcomes_consumer');
    errors = require('./errors');
    Authentication = require('./authentication');
  
    Consumer = (function() {
    function Consumer(provider_url, signature_method) {
      this.sign_request = bind(this.sign_request, this);
      this.enable_outcomes = bind(this.enable_outcomes, this);
      this._valid_parameters = bind(this._valid_parameters, this);
      this.build_form = bind(this.build_form, this);
      if (typeof provider_url === 'undefined' || provider_url === null) {
        throw new errors.ConsumerError('Must specify tool provider url');
      }
      this.authentication = new Authentication(provider_url, signature_method);
      this.provider_url = provider_url;
      this.outcome_service = null;
    }

    Consumer.prototype.set_credentials = function(consumer_key, consumer_secret) {
        this.authentication.set_credentials(consumer_key, consumer_secret);
    };
    
    Consumer.prototype.initialize_params = function() {
      var params = [];
      params.lti_message_type = 'basic-lti-launch-request';
      params.lti_version = 'LTI-1p0';
      return params;
    };

    Consumer.prototype.sign_request = function(params, callback) {
      if (typeof this.authentication.consumer_key === 'undefined' || this.authentication.consumer_key === null) {
        throw new errors.ConsumerError('Must specify consumer_key');
      }
      if (typeof this.authentication.consumer_secret === 'undefined' || this.authentication.consumer_secret === null) {
        throw new errors.ConsumerError('Must specify consumer_secret');
      }
      if (!this._valid_parameters(params)) {
        return callback(new errors.ParameterError('Invalid LTI parameters'), false);
      }
      return this.authentication.sign_request(params, callback);
    };

    Consumer.prototype._valid_parameters = function(body) {
      var correct_message_type, correct_version, has_resource_link_id;
      if (!body) {
        return false;
      }
      correct_message_type = body.lti_message_type === 'basic-lti-launch-request';
      correct_version = require('./ims-lti').supported_versions.indexOf(body.lti_version) !== -1;
      has_resource_link_id = body.resource_link_id !== null;
      return correct_message_type && correct_version && has_resource_link_id;
    };
    
    Consumer.prototype.build_form = function(params) {
        var page = `<html>
    <head>
        <script>
function launch() {
    var button = document.getElementById("launchButton");
    button.style.display = "none";
    var frm = document.getElementById("ltiLaunch");
    frm.submit();
}
        </script>
    </head>
    <body onload="launch();">
        <form action="${this.provider_url}" id="ltiLaunch" method="post" encType="application/x-www-form-urlencoded">`;
        for (var field in params) {
            var value = params[field];
            page += `<input type="hidden" name="${field}" value="${value}"/>`;
        }
        page += `
            <input type="submit" id="launchButton" value="Click to launch the learning tool"/>
        </form>
    </body>
</html>
`;
        return page;
    };

    Consumer.prototype.enable_outcomes = function(params, endpoint, result_sourced_id, options) {
        var auth = this.authentication;
        this.outcome_service = new OutcomesConsumer(endpoint, auth.signer);
        params.lis_outcome_service_url = endpoint;
        if (options && options.hasOwnProperty("enableResultData")) {
            params.ext_outcome_data_values_accepted = options.enableResultData.join(",");
        }
        params.lis_result_sourcedid = result_sourced_id;
    };  

    return Consumer;

  })();

  exports = module.exports = Consumer;

}).call(this);