---
description: tags json集合 用于tag页
---
var qii_global_tags = {
    {% for tag in site.tags %}
        {% if tag[0] != site.tags.first[0] %},{% endif %}
        '{{ tag[0] }}':
            [
                {% for post in tag[1] %}
                    {
                        'url':'{{post.url}}',
                        'title':'{{post.title}}',
                        'date':'{{post.date | date:'%Y-%m-%d'}}',
                        'excerpt':'{{post.excerpt | strip_newlines }}',
                        'tags':[
                                {% for tag in post.tags %}
                                    '{{ tag }}'{% if tag != post.tags.last %},{% endif %}
                                {% endfor %}
                        ]
                    }
                    {% if post != tag[1].last %},{% endif %}
                {% endfor %}
            ]
    {% endfor %}
}
