function doGet(e) {
  return HtmlService.createHtmlOutput(new TrelloNewsletterContent(new TrelloService()).getNewsletterContent(e.parameters.nocache));
}

function trelloAuthCallback(request) {
  new TrelloService().authCallback(request);
}

function TrelloNewsletterContent(service) {
  this.service = service;
}

TrelloNewsletterContent.prototype = {

  constructor: TrelloNewsletterContent,
  getNewsletterContent: function(skipCache) {
    var cfg = config.trello_config;
    var newListContent = this.getListContent(cfg.newContentList);
    var oldListContent = this.getListContent(cfg.oldContentList);
    var retiredListContent = this.getListContent(cfg.retiredContentList);
    return this.wrapHtml(newListContent + oldListContent + retiredListContent);
  },

  getNewsletterContent: function(skipCache) {
    var scriptCache = CacheService.getScriptCache();
    var result = scriptCache.get("newsletter-content");
    if(skipCache ||  result == null) {
      var cfg = config.trello_config;
      var newListContent = this.getListContent(cfg.newContentList);
      var oldListContent = this.getListContent(cfg.oldContentList);
      var retiredListContent = this.getListContent(cfg.retiredContentList);
      result = this.wrapHtml(newListContent + oldListContent + retiredListContent);
      scriptCache.put("newsletter-content", result, 3600); // cache for 1 hour
      Logger.log("cache miss");
    } else {
      Logger.log("cache hit");
    }
    return result;
  },
    
  wrapHtml: function(body) {
    return "<html><head>" +
      "<link rel='stylesheet' href='//netdna.bootstrapcdn.com/bootstrap/3.0.1/css/bootstrap.min.css'></link>" +
      "<meta name='viewport' content='width=device-width, initial-scale=1, user-scalable=no'></meta>" +
      "<title>Newsletter Content</title></head><body><div class='container'>" +
      body + "</container></body></html>";
  },

  getListContent: function(listName) {
    var listId = this.getTargetListId(listName);
    var cards = this.service.get("/lists/" + listId + "/cards/?");
    var concatCards = function(fullContent, card) {
      return fullContent + card.desc + "\n\n---\n\n";
    };
    var content = cards.reduce(concatCards, "# " + listName + "\n\n---\n\n");
    return this.formatMarkdown(content);
  },

  // import library M6WggW1B7uEj1Nu0p7S6Pf-Mffa6w-w2J
  formatMarkdown: function(content) {
    var converter = new GASShowdown.Showdown.converter();
    var result = converter.makeHtml(content);
    return result;
  },

  getTargetListId: function(listName) {
    var cfg = config.trello_config;
    var boards = this.service.get("members/me/boards?");
    var targetBoardId = (boards.filter(function(board, index) {
      return board.name == cfg.boardName;
    }))[0].id;
    var lists = this.service.get("boards/" + targetBoardId + "?lists=open&list_fields=name&fields=name,desc&").lists;
    var list = (lists.filter(function(list, index) {
      return list.name == listName;
    }))[0];
    return list.id;
  }
};


function TrelloService() {}

// encapsulation for testing
TrelloService.prototype = {
  constructor: TwitterService,
  /**
   * Reset the authorization state, so that it can be re-tested.
   */
  reset: function() {
    var service = this.getService();
    service.reset();
  },

  /**
   * Configures the service.
   */
  getService: function() {
    var cfg = config.trello_config;
    return OAuth1.createService('Trello')
      // Set the endpoint URLs.
      .setRequestTokenUrl('https://trello.com/1/OAuthGetRequestToken')
      .setAuthorizationUrl('https://trello.com/1/OAuthAuthorizeToken?expiration=' + cfg.expiration)
      .setAccessTokenUrl('https://trello.com/1/OAuthGetAccessToken')
      .setConsumerKey(cfg.consumerKey)
      .setConsumerSecret(cfg.consumerSecret)
      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('trelloAuthCallback')
      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
  },

  /**
   * Handles the OAuth callback.
   */
  authCallback: function(request) {
    var service = this.getService();
    var authorized = service.handleCallback(request);
    if (authorized) {
      return HtmlService.createHtmlOutput('Success!');
    } else {
      return HtmlService.createHtmlOutput('Denied');
    }
  },

  get: function(apiCall) {
    var service = this.getService();
    if (service.hasAccess()) {
      var url = "https://api.trello.com/1/" + apiCall;
      var response = service.fetch(url);
      var result = JSON.parse(response.getContentText());
      Logger.log(JSON.stringify(result, null, 2));
      return result;
    } else {
      var authorizationUrl = service.authorize();
      Logger.log('Open the following URL and re-run the script: %s',
        authorizationUrl);
    }
  }
};
